const supabase = require('../config/database');
const { getGenerativeModel } = require('../config/gemini');
const { MODULE_GENERATION_PROMPT } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

async function generateModules(docId, documentText) {
  const teachingLevel = await getUserTeachingLevel();
  const prompt = MODULE_GENERATION_PROMPT
    .replace('{document_text}', documentText)
    .replace('{teaching_level}', teachingLevel);

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
    throw new Error('Failed to parse module generation response as JSON');
  }

  for (let index = 0; index < parsed.modules.length; index++) {
    const mod = parsed.modules[index];
    const id = uuidv4();
    const topic = mod.topic || mod.title;

    const moduleRow = {
      id,
      document_id: docId,
      order_index: index,
      title: mod.title,
      topic,
      objectives: mod.objectives,
      content: mod.content,
      takeaways: mod.takeaways,
    };

    const questionRows = (mod.questions || []).map(q => ({
      id: uuidv4(),
      module_id: id,
      type: q.type,
      question: q.question,
      options: q.options || null,
      correct: q.correct,
      explanation: q.explanation || null,
      topic: q.topic || topic,
    }));

    await insertModuleWithQuestions(moduleRow, questionRows);
  }

  // Re-read from DB for consistent formatting
  return await getModulesByDocument(docId);
}

async function insertModuleWithQuestions(moduleData, questions) {
  const { error: modErr } = await supabase.from('modules').insert(moduleData);
  if (modErr) throw modErr;

  if (questions.length > 0) {
    const { error: qErr } = await supabase.from('questions').insert(questions);
    if (qErr) {
      // Rollback: delete the module we just inserted
      await supabase.from('modules').delete().eq('id', moduleData.id);
      throw qErr;
    }
  }
}

async function getModulesByDocument(docId) {
  const { data: rows, error } = await supabase
    .from('modules')
    .select('*')
    .eq('document_id', docId)
    .order('order_index');
  if (error) throw error;

  const modules = [];
  for (const row of (rows || [])) {
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('module_id', row.id);
    if (qErr) throw qErr;
    modules.push(formatModule(row, questions || []));
  }
  return modules;
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

  const modules = [];
  for (const row of (rows || [])) {
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('module_id', row.id);
    if (qErr) throw qErr;
    modules.push(formatModule(row, questions || []));
  }
  return modules;
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

  for (const mod of modules) {
    // Find resources matching this module's topic
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

    const updatedContent = mod.content + resourceSection;

    await supabase.from('modules').update({ content: updatedContent }).eq('id', mod.id);
  }
}

module.exports = {
  generateModules,
  getModulesByDocument,
  getModuleById,
  getAllModules,
  deleteModulesByDocument,
  enrichModulesWithResources,
};
