const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { BRIDGE_MODULE_GENERATION_PROMPT, getModuleDepthSection, getQuizDepthSection } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

// In-flight dedup: tracks moduleIds currently generating bridges
const _generatingBridges = new Set();

/**
 * Check whether a bridge module should be generated for this quiz attempt.
 * Returns false if: score >= 60, module is itself a bridge, bridge already exists,
 * or a bridge is currently being generated for this module.
 */
async function shouldGenerateBridge(moduleId, score, userId) {
  if (score >= 60) return false;

  // Check in-flight
  if (_generatingBridges.has(moduleId)) return false;

  // Fetch the module to check its type
  const { data: mod, error: modErr } = await supabase
    .from('modules')
    .select('module_type')
    .eq('id', moduleId)
    .single();

  if (modErr || !mod) return false;

  // No bridges-for-bridges
  if (mod.module_type === 'bridge') return false;

  // Check if a bridge already exists for this parent module
  const { data: existing, error: exErr } = await supabase
    .from('modules')
    .select('id')
    .eq('parent_module_id', moduleId)
    .eq('module_type', 'bridge')
    .limit(1);

  if (exErr) return false;
  if (existing && existing.length > 0) return false;

  return true;
}

/**
 * Extract which concepts the student struggled with based on wrong answers.
 * Returns { wrongAnswers: [...], struggledTopics: [...] }
 */
function extractStruggledConcepts(module, answers) {
  const questions = module.questions || [];
  const wrongAnswers = [];
  const topicSet = new Set();

  for (const q of questions) {
    const userAnswer = answers?.[q.id];
    if (!userAnswer) continue;

    const isCorrect = userAnswer.toLowerCase() === q.correct?.toLowerCase();
    if (!isCorrect) {
      wrongAnswers.push({
        question: q.question,
        userAnswer,
        correctAnswer: q.correct,
        explanation: q.explanation || '',
        topic: q.topic || module.topic,
      });
      topicSet.add(q.topic || module.topic);
    }
  }

  return {
    wrongAnswers,
    struggledTopics: Array.from(topicSet),
  };
}

/**
 * Call LLM to generate bridge module content.
 */
async function generateBridgeContent(parentModule, wrongAnswers, struggledTopics, teachingLevel) {
  const wrongAnswersText = wrongAnswers.map((wa, i) =>
    `${i + 1}. Q: ${wa.question}\n   Student answered: "${wa.userAnswer}" | Correct: "${wa.correctAnswer}"\n   Why wrong: ${wa.explanation}`
  ).join('\n\n');

  const { depthSection } = getModuleDepthSection(parentModule.content || '');
  const quizDepthSection = getQuizDepthSection(parentModule.content || '');

  const prompt = BRIDGE_MODULE_GENERATION_PROMPT
    .replace('{score}', String(Math.round(wrongAnswers.length > 0 ? ((parentModule.questions.length - wrongAnswers.length) / parentModule.questions.length) * 100 : 0)))
    .replace('{parent_title}', parentModule.title)
    .replace('{teaching_level}', teachingLevel)
    .replace('{depth_section}', depthSection)
    .replace('{parent_content}', (parentModule.content || '').substring(0, 4000))
    .replace('{wrong_answers}', wrongAnswersText)
    .replace('{struggled_topics}', struggledTopics.join(', '))
    .replace('{quiz_depth_section}', quizDepthSection);

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  }, 3, 0);
  const text = result.response.text();
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    // If it's a list or multiple modules, try to salvage the first one
    const { tryExtractModulesFromJSON } = require('./moduleGenerator');
    const modules = tryExtractModulesFromJSON(jsonStr);
    return modules[0] || JSON.parse(jsonStr); // Fallback to original error if nothing found
  }
}

/**
 * Insert the bridge module into the DB, shifting subsequent order_indices.
 */
async function insertBridgeModule(docId, parentModuleId, parentOrderIndex, bridgeData, userId, bridgeMeta) {
  // Shift all modules after the parent's position
  const { error: shiftErr } = await supabase.rpc('shift_module_order_indices', {
    p_document_id: docId,
    p_after_index: parentOrderIndex,
  });
  if (shiftErr) throw shiftErr;

  const bridgeId = uuidv4();
  const moduleRow = {
    id: bridgeId,
    document_id: docId,
    order_index: parentOrderIndex + 1,
    title: bridgeData.title || `Review: ${bridgeMeta?.struggledTopics?.[0] || 'Concepts'}`,
    topic: bridgeData.topic || bridgeMeta?.struggledTopics?.[0] || 'Review',
    objectives: Array.isArray(bridgeData.objectives) ? bridgeData.objectives : [`Review ${bridgeMeta?.struggledTopics?.[0] || 'struggled concepts'}`],
    content: bridgeData.content || 'Content generation failed for this review module.',
    takeaways: Array.isArray(bridgeData.takeaways) ? bridgeData.takeaways : [],
    module_type: 'bridge',
    parent_module_id: parentModuleId,
    bridge_meta: bridgeMeta || {},
  };

  const { error: modErr } = await supabase.from('modules').insert(moduleRow);
  if (modErr) throw modErr;

  // Insert bridge quiz questions
  const questions = bridgeData.questions || bridgeData.comprehension_questions || [];
  const questionRows = questions.map(q => {
    const qType = q.type || (q.options ? 'multiple_choice' : 'true_false');
    const qOptions = Array.isArray(q.options) ? q.options : (qType === 'multiple_choice' ? ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'] : null);
    
    return {
      id: uuidv4(),
      module_id: bridgeId,
      type: qType,
      question: q.question || 'Comprehension check question.',
      options: qOptions,
      correct: String(q.correct || (qType === 'true_false' ? 'true' : 'A')),
      explanation: q.explanation || 'Answer based on the review content.',
      topic: q.topic || moduleRow.topic,
    };
  }).filter(q => q.question);

  if (questionRows.length > 0) {
    const { error: qErr } = await supabase.from('questions').insert(questionRows);
    if (qErr) throw qErr;
  }

  return bridgeId;
}

/**
 * Orchestrate bridge generation in the background via setImmediate.
 * Non-blocking — the student continues while the bridge is created.
 */
function triggerBridgeGeneration(moduleId, module, score, answers, userId) {
  _generatingBridges.add(moduleId);

  setImmediate(async () => {
    try {
      const { wrongAnswers, struggledTopics } = extractStruggledConcepts(module, answers);

      if (wrongAnswers.length === 0) {
        console.log(`[bridgeModule] No wrong answers found for module "${module.title}" — skipping bridge`);
        return;
      }

      const teachingLevel = await getUserTeachingLevel(userId);
      const bridgeData = await generateBridgeContent(module, wrongAnswers, struggledTopics, teachingLevel);

      const bridgeMeta = {
        parentScore: score,
        wrongCount: wrongAnswers.length,
        totalQuestions: (module.questions || []).length,
        struggledTopics,
      };

      const bridgeId = await insertBridgeModule(
        module.documentId,
        moduleId,
        module.orderIndex,
        bridgeData,
        userId,
        bridgeMeta
      );

      console.log(`[bridgeModule] Bridge generated for module "${module.title}" (score: ${score}%) → ${bridgeId.slice(0, 8)}`);
    } catch (err) {
      console.error(`[bridgeModule] Failed to generate bridge for module ${moduleId.slice(0, 8)}:`, err.message);
    } finally {
      _generatingBridges.delete(moduleId);
    }
  });
}

module.exports = {
  shouldGenerateBridge,
  extractStruggledConcepts,
  generateBridgeContent,
  insertBridgeModule,
  triggerBridgeGeneration,
};
