const supabase = require('../config/database');
const { getGenerativeModel, getSearchGroundedModel } = require('../config/gemini');
const { SOLVER_PROMPT, SOLVER_FOLLOWUP_PROMPT } = require('../utils/prompts');
const vectorStore = require('./vectorStore');
const { getUserTeachingLevel } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

/**
 * Solve a STEM problem step-by-step using Gemini 2.5 Pro.
 */
async function solveProblem(problem, subject, docId, useWebSearch) {
  const teachingLevel = await getUserTeachingLevel();

  // Build optional context from uploaded study materials (PRIMARY source)
  let contextSection = '';
  if (docId) {
    try {
      const relevantChunks = await vectorStore.search(problem, 5, docId);
      if (relevantChunks.length > 0) {
        const contextText = relevantChunks.map(c => c.text).join('\n\n---\n\n');
        contextSection = `PRIMARY REFERENCE — The student's own study materials (highest priority):\n${contextText}\n\nIMPORTANT: Use the student's study materials above as your primary reference. Your solution should align with the notation, terminology, methods, and conventions used in their materials. If web search results conflict with the student's materials, defer to the student's materials. Web search results should only supplement — never override — what the student is learning.`;
      }
    } catch {
      // Continue without context
    }
  }

  const prompt = SOLVER_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{problem}', problem)
    .replace('{context_section}', contextSection);

  // Always use advanced model for problem solving; optionally with web search grounding
  const model = useWebSearch
    ? getSearchGroundedModel('advanced')
    : getGenerativeModel('advanced');

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse solver response');
  }

  // Extract grounding sources if web search was used
  let sources = null;
  if (useWebSearch) {
    const groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sources = groundingChunks
      .filter(chunk => chunk.web?.uri)
      .map(chunk => ({
        title: chunk.web.title || '',
        url: chunk.web.uri,
      }));
  }

  const sessionId = uuidv4();

  // Store solver session
  const { error: sessErr } = await supabase.from('solver_sessions').insert({
    id: sessionId,
    problem,
    subject: parsed.subject || subject || null,
    solution: parsed.final_answer,
    steps_json: parsed.steps,
    document_id: docId || null,
    sources_json: sources,
  });
  if (sessErr) throw sessErr;

  // Record study session for analytics
  const { error: studyErr } = await supabase.from('study_sessions').insert({
    mode: 'solver',
    details_json: {
      sessionId,
      subject: parsed.subject,
      problemType: parsed.problem_type,
    },
  });
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
    createdAt: new Date().toISOString(),
  };
}

/**
 * Handle a follow-up question about a previously solved problem.
 */
async function solveFollowUp(sessionId, followUpQuestion) {
  const { data: session, error } = await supabase
    .from('solver_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code === 'PGRST116') {
    throw new Error('Solver session not found');
  }
  if (error) throw error;

  const teachingLevel = await getUserTeachingLevel();

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

  const model = getGenerativeModel('advanced');
  const result = await model.generateContent(prompt);

  return {
    explanation: result.response.text(),
    sessionId,
  };
}

/**
 * Get solver session history.
 */
async function getSolverHistory(limit = 20) {
  const { data, error } = await supabase
    .from('solver_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
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
