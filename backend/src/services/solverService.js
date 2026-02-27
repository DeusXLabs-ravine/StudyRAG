const supabase = require('../config/database');
const { getGenerativeModel, getSearchGroundedModel } = require('../config/gemini');
const { isDeepSeekAvailable, callDeepSeekR1 } = require('../config/deepseek');
const { SOLVER_PROMPT, SOLVER_FOLLOWUP_PROMPT, buildInterestsSection, buildLearningStyleSection, buildPaceSection } = require('../utils/prompts');
const vectorStore = require('./vectorStore');
const { searchPageIndex } = require('./pageIndexService');
const { getUserTeachingLevel, getUserInterests, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

/**
 * Solve a STEM problem step-by-step using Gemini 3 Pro.
 */
async function solveProblem(problem, subject, docId, useWebSearch, userId = null) {
  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  // Build optional context from uploaded study materials (PRIMARY source)
  let contextSection = '';
  if (docId) {
    try {
      const pageIndex = await vectorStore.getPageIndex(docId);
      if (pageIndex) {
        // Parallel dual search (#9): search for core concept AND formulas/methods simultaneously
        const formulaQuery = `formulas, equations, theorems, methods, definitions related to: ${problem.slice(0, 200)}`;
        const [conceptResults, formulaResults] = await Promise.all([
          searchPageIndex(problem, pageIndex.treeJson, { docId }),
          searchPageIndex(formulaQuery, pageIndex.treeJson, { docId }),
        ]);

        // Merge and deduplicate page numbers
        const allPageNumbers = new Set();
        for (const r of [...conceptResults, ...formulaResults]) {
          allPageNumbers.add(r.page);
        }

        if (allPageNumbers.size > 0) {
          const pages = await vectorStore.getPages(docId, [...allPageNumbers]);
          if (pages.length > 0) {
            const contextText = pages.map(p =>
              `[Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${p.text}`
            ).join('\n\n---\n\n');
            contextSection = `PRIMARY REFERENCE — The student's own study materials (highest priority):\n${contextText}\n\nIMPORTANT: Use the student's study materials above as your primary reference. Your solution should align with the notation, terminology, methods, and conventions used in their materials. If web search results conflict with the student's materials, defer to the student's materials. Web search results should only supplement — never override — what the student is learning.`;
          }
        }
      } else {
        // Fallback: use old vector search for legacy documents
        const relevantChunks = await vectorStore.search(problem, 5, docId);
        if (relevantChunks.length > 0) {
          const contextText = relevantChunks.map(c => c.text).join('\n\n---\n\n');
          contextSection = `PRIMARY REFERENCE — The student's own study materials (highest priority):\n${contextText}\n\nIMPORTANT: Use the student's study materials above as your primary reference. Your solution should align with the notation, terminology, methods, and conventions used in their materials. If web search results conflict with the student's materials, defer to the student's materials. Web search results should only supplement — never override — what the student is learning.`;
        }
      }
    } catch {
      // Continue without context
    }
  }

  const prompt = SOLVER_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{problem}', problem)
    .replace('{context_section}', contextSection)
    .replace('{interests_section}', buildInterestsSection(interests))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace));

  // Try DeepSeek R1 first (better at STEM reasoning), fall back to Gemini
  let parsed;
  let sources = null;
  let reasoning = null;

  if (isDeepSeekAvailable() && !useWebSearch) {
    try {
      console.log('[Solver] Using DeepSeek R1');
      const dsResult = await callDeepSeekR1(null, prompt);
      reasoning = dsResult.reasoning || null;
      const jsonStr = dsResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.warn('[Solver] DeepSeek R1 failed, falling back to Gemini:', err.message);
      parsed = null;
    }
  }

  if (!parsed) {
    // Gemini fallback (also used when useWebSearch is true for grounding)
    const model = useWebSearch
      ? getSearchGroundedModel('advanced')
      : getGenerativeModel('advanced');

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('Failed to parse solver response');
    }

    if (useWebSearch) {
      const groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      sources = groundingChunks
        .filter(chunk => chunk.web?.uri)
        .map(chunk => ({
          title: chunk.web.title || '',
          url: chunk.web.uri,
        }));
    }
  }

  const sessionId = uuidv4();

  // Store solver session
  const solverRow = {
    id: sessionId,
    problem,
    subject: parsed.subject || subject || null,
    solution: parsed.final_answer,
    steps_json: parsed.steps,
    document_id: docId || null,
    sources_json: sources,
  };
  if (userId) solverRow.user_id = userId;
  const { error: sessErr } = await supabase.from('solver_sessions').insert(solverRow);
  if (sessErr) throw sessErr;

  // Record study session for analytics
  const studyRow = {
    mode: 'solver',
    details_json: {
      sessionId,
      subject: parsed.subject,
      problemType: parsed.problem_type,
    },
  };
  if (userId) studyRow.user_id = userId;
  const { error: studyErr } = await supabase.from('study_sessions').insert(studyRow);
  if (studyErr) throw studyErr;

  return {
    id: sessionId,
    subject: parsed.subject,
    problemType: parsed.problem_type,
    prerequisites: parsed.prerequisites || [],
    steps: parsed.steps || [],
    finalAnswer: parsed.final_answer,
    summary: parsed.summary,
    tips: parsed.tips || [],
    sources: sources || [],
    reasoning,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Handle a follow-up question about a previously solved problem.
 */
async function solveFollowUp(sessionId, followUpQuestion, userId = null) {
  const { data: session, error } = await supabase
    .from('solver_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code === 'PGRST116') {
    throw new Error('Solver session not found');
  }
  if (error) throw error;

  const teachingLevel = await getUserTeachingLevel(userId);

  // Build a readable summary of the original solution
  const stepsText = (session.steps_json || [])
    .map(s => `Step ${s.step_number}: ${s.title}\n${s.explanation}\n${s.work}\nResult: ${s.result}`)
    .join('\n\n');
  const originalSolution = `${stepsText}\n\nFinal Answer: ${session.solution}`;

  const prompt = SOLVER_FOLLOWUP_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{original_problem}', session.problem)
    .replace('{original_solution}', originalSolution)
    .replace('{followup_question}', followUpQuestion);

  let explanation;
  let reasoning = null;

  if (isDeepSeekAvailable()) {
    try {
      console.log('[Solver] Follow-up using DeepSeek R1');
      const dsResult = await callDeepSeekR1(null, prompt);
      explanation = dsResult.content;
      reasoning = dsResult.reasoning || null;
    } catch (err) {
      console.warn('[Solver] DeepSeek R1 follow-up failed, falling back to Gemini:', err.message);
      explanation = null;
    }
  }

  if (!explanation) {
    const model = getGenerativeModel('advanced');
    const result = await model.generateContent(prompt);
    explanation = result.response.text();
  }

  return {
    explanation,
    reasoning,
    sessionId,
  };
}

/**
 * Get solver session history.
 */
async function getSolverHistory(limit = 20, userId = null) {
  const query = supabase
    .from('solver_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    problem: row.problem,
    subject: row.subject,
    solution: row.solution,
    steps: row.steps_json,
    documentId: row.document_id,
    sources: row.sources_json,
    createdAt: row.created_at,
  }));
}

module.exports = { solveProblem, solveFollowUp, getSolverHistory };
