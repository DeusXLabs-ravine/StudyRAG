const supabase = require('../config/database');
const { getGenerativeModel } = require('../config/gemini');
const { MODULE_GENERATION_PROMPT, QUESTION_REGENERATION_PROMPT } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');
const { prepareTextForLLM } = require('./chunkingService');
const { v4: uuidv4 } = require('uuid');

async function generateModules(docId, documentText) {
  const teachingLevel = await getUserTeachingLevel();
  // Truncate large documents to ~50K chars to keep Gemini response time reasonable
  const llmText = prepareTextForLLM(documentText, 50000);
  const prompt = MODULE_GENERATION_PROMPT
    .replace('{document_text}', llmText)
    .replace('{teaching_level}', teachingLevel);

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse module generation response as JSON');
  }

  // Build all rows in memory first, then batch insert
  const allModuleRows = [];
  const allQuestionRows = [];

  for (let index = 0; index < parsed.modules.length; index++) {
    const mod = parsed.modules[index];
    const id = uuidv4();
    const topic = mod.topic || mod.title;

    allModuleRows.push({
      id,
      document_id: docId,
      order_index: index,
      title: mod.title,
      topic,
      objectives: mod.objectives,
      content: mod.content,
      takeaways: mod.takeaways,
    });

    for (const q of (mod.questions || [])) {
      allQuestionRows.push({
        id: uuidv4(),
        module_id: id,
        type: q.type,
        question: q.question,
        options: q.options || null,
        correct: q.correct,
        explanation: q.explanation || null,
        topic: q.topic || topic,
      });
    }
  }

  // Single batch insert for all modules
  const { error: modErr } = await supabase.from('modules').insert(allModuleRows);
  if (modErr) throw modErr;

  // Single batch insert for all questions
  if (allQuestionRows.length > 0) {
    const { error: qErr } = await supabase.from('questions').insert(allQuestionRows);
    if (qErr) throw qErr;
  }

  // Re-read from DB for consistent formatting
  return await getModulesByDocument(docId);
}

async function getModulesByDocument(docId) {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .eq('document_id', docId)
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch all questions for these modules in a single query
  const moduleIds = rows.map(r => r.id);
  const { data: allQuestions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .in('module_id', moduleIds);
  if (qErr) throw qErr;

  // Group questions by module_id
  const questionsByModule = {};
  for (const q of (allQuestions || [])) {
    if (!questionsByModule[q.module_id]) questionsByModule[q.module_id] = [];
    questionsByModule[q.module_id].push(q);
  }

  return rows.map(row => formatModule(row, questionsByModule[row.id] || []));
}

async function getModuleById(moduleId) {
  const { data: row, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('module_id', moduleId);
  if (qErr) throw qErr;

  return formatModule(row, questions || []);
}

async function getAllModules() {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index');
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Fetch all questions in a single query
  const moduleIds = rows.map(r => r.id);
  const { data: allQuestions, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .in('module_id', moduleIds);
  if (qErr) throw qErr;

  const questionsByModule = {};
  for (const q of (allQuestions || [])) {
    if (!questionsByModule[q.module_id]) questionsByModule[q.module_id] = [];
    questionsByModule[q.module_id].push(q);
  }

  return rows.map(row => formatModule(row, questionsByModule[row.id] || []));
}

async function deleteModulesByDocument(docId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('document_id', docId);
  if (error) throw error;
}

function formatModule(row, questionRows) {
  return {
    id: row.id,
    documentId: row.document_id,
    orderIndex: row.order_index,
    title: row.title,
    topic: row.topic,
    objectives: row.objectives,
    content: row.content,
    takeaways: row.takeaways,
    questions: questionRows.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
      topic: q.topic,
    })),
    createdAt: row.created_at,
  };
}

/**
 * Enrich existing modules with web research resources.
 * Appends a "Supplementary Resources" markdown section to each module's content.
 */
async function enrichModulesWithResources(docId) {
  const { getResourcesByDocument } = require('./webResearchService');
  const resources = await getResourcesByDocument(docId);
  if (resources.length === 0) return;

  const modules = await getModulesByDocument(docId);

  // Build all updates, then execute in parallel
  const updates = [];
  for (const mod of modules) {
    const relevant = resources.filter(r => {
      if (!r.topic || !mod.topic) return false;
      const rTopic = r.topic.toLowerCase();
      const mTopic = mod.topic.toLowerCase();
      return rTopic.includes(mTopic) || mTopic.includes(rTopic);
    });

    if (relevant.length === 0) continue;

    const resourceSection = '\n\n---\n\n### Supplementary Resources\n\n' +
      '*These external resources are optional further reading to complement your study materials above. Your uploaded materials remain the primary source for this course.*\n\n' +
      relevant.slice(0, 5).map(r => {
        const link = r.url ? `[${r.title}](${r.url})` : `**${r.title}**`;
        return `- ${link} *(${r.resourceType})* — ${r.snippet || ''}`;
      }).join('\n');

    updates.push(
      supabase.from('modules').update({ content: mod.content + resourceSection }).eq('id', mod.id)
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

async function regenerateQuestions(moduleId) {
  const mod = await getModuleById(moduleId);
  if (!mod) throw new Error('Module not found');

  const teachingLevel = await getUserTeachingLevel();

  // Format previous questions for the prompt
  const prevQuestionsText = mod.questions
    .map(q => `- [${q.type}] ${q.question}`)
    .join('\n');

  const prompt = QUESTION_REGENERATION_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{module_content}', mod.content)
    .replace('{previous_questions}', prevQuestionsText)
    .replace(/\{topic\}/g, mod.topic || mod.title);

  const { selectModelTier } = require('../config/gemini');
  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse question regeneration response as JSON');
  }

  // Delete old questions
  const { error: delErr } = await supabase
    .from('questions')
    .delete()
    .eq('module_id', moduleId);
  if (delErr) throw delErr;

  // Insert new questions
  const newQuestions = (parsed.questions || []).map(q => ({
    id: uuidv4(),
    module_id: moduleId,
    type: q.type,
    question: q.question,
    options: q.options || null,
    correct: q.correct,
    explanation: q.explanation || null,
    topic: q.topic || mod.topic,
  }));

  if (newQuestions.length > 0) {
    const { error: insErr } = await supabase.from('questions').insert(newQuestions);
    if (insErr) throw insErr;
  }

  // Return updated module
  return await getModuleById(moduleId);
}

module.exports = {
  generateModules,
  getModulesByDocument,
  getModuleById,
  getAllModules,
  deleteModulesByDocument,
  enrichModulesWithResources,
  regenerateQuestions,
};
