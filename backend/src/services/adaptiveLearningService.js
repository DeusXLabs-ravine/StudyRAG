/**
 * Adaptive learning engine — the "dynamic course" logic.
 *
 * A course here is not a fixed artifact. When a student fails a comprehension
 * check, redoes a module, or repeatedly stalls, the affected module is rewritten
 * for THEM: same facts, taught a different way, aimed squarely at the specific
 * misconception the wrong answers revealed. This is the mechanism the founder
 * asked for — a course that adapts to pace, understanding, and analogy instead
 * of serving the same explanation that already failed once.
 *
 * What lives where:
 *   - learning_records  — durable, ADR-style insights that steer future teaching
 *   - module_versions   — archive of superseded content (reversible rewrites)
 *   - module_regenerations — audit + rate-limit ledger
 *
 * Everything is grounded in the module's own existing content, so a rewrite can
 * never invent facts or drift from the source material; only the teaching changes.
 */
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { getModuleById, regenerateModuleContent } = require('./moduleGenerator');
const { getWeakTopics, getUserInterests, getEffectiveLearningPace } = require('./userProfileService');
const { moduleCache } = require('../config/cache');

// ── Regeneration guards ──────────────────────────────────────
// A rewrite is a full LLM generation, so it must be earned, not fired on every
// slip. These bounds stop runaway cost and rewrite loops.
const REGEN_SCORE_THRESHOLD = 55;   // below this = genuine struggle, not a near-miss
const REGEN_COOLDOWN_MS = 10 * 60 * 1000; // don't rewrite the same module twice within 10 min
const REGEN_MAX_TOTAL = 3;          // give up adapting a module after this many rewrites

// ── Signal extraction ────────────────────────────────────────

/**
 * From a submitted quiz, pull the concepts the student got wrong and the
 * specific false belief each wrong answer encodes.
 *
 * @param {object} module  formatModule() shape, including questions.
 * @param {object} answers { [questionId]: userAnswerString }
 * @returns {{ wrongAnswers: object[], struggledTopics: string[], misconceptions: string[] }}
 */
function extractStruggle(module, answers) {
  const questions = module.questions || [];
  const wrongAnswers = [];
  const topicSet = new Set();
  const misconceptions = [];

  for (const q of questions) {
    const userAnswer = answers?.[q.id];
    if (userAnswer == null) continue;

    const isCorrect = String(userAnswer).toLowerCase() === String(q.correct || '').toLowerCase();
    if (isCorrect) continue;

    const topic = q.topic || module.topic;
    wrongAnswers.push({
      question: q.question,
      userAnswer,
      correctAnswer: q.correct,
      explanation: q.explanation || '',
      topic,
    });
    if (topic) topicSet.add(topic);

    // Prefer the model-supplied misconception (present on regenerated questions);
    // otherwise synthesize a plain description from the wrong choice.
    if (q.misconception) {
      misconceptions.push(q.misconception);
    } else {
      misconceptions.push(`On "${topic}", chose "${userAnswer}" instead of "${q.correct}".`);
    }
  }

  return {
    wrongAnswers,
    struggledTopics: Array.from(topicSet),
    misconceptions,
  };
}

// ── Learning records (durable memory) ────────────────────────

async function recordLearningSignal({ userId, documentId, moduleId, topic, recordType, content, evidence }) {
  try {
    const row = {
      id: uuidv4(),
      user_id: userId || null,
      document_id: documentId || null,
      module_id: moduleId || null,
      topic: topic || null,
      record_type: recordType,
      content,
      evidence: evidence || null,
      status: 'active',
    };
    const { error } = await supabase.from('learning_records').insert(row);
    if (error) throw error;
    return row.id;
  } catch (err) {
    // Recording is best-effort — never let it break the request that triggered it.
    console.warn(`[adaptive] recordLearningSignal failed: ${err.message}`);
    return null;
  }
}

/**
 * When a topic is later mastered, retire the stale misconception/struggle records
 * for it so they stop steering regeneration. Keeps the learner model current.
 */
async function resolveRecordsForTopic(userId, topic) {
  if (!userId || !topic) return;
  try {
    await supabase
      .from('learning_records')
      .update({ status: 'resolved' })
      .eq('user_id', userId)
      .eq('topic', topic)
      .eq('status', 'active')
      .in('record_type', ['misconception', 'struggle']);
  } catch (err) {
    console.warn(`[adaptive] resolveRecordsForTopic failed: ${err.message}`);
  }
}

// ── Learner state (the input to adaptive teaching) ───────────

/**
 * Assemble what we know about a learner into the shape the pedagogy prompt
 * blocks consume (see prompts/pedagogy.js buildLearnerStateSection).
 *
 * Everything is best-effort: on any failure the field is simply omitted and the
 * prompt degrades to its non-adaptive form. Never throws.
 */
async function buildLearnerState(userId, { documentId, moduleId, topic } = {}) {
  const state = {};
  if (!userId) return state;

  const [recordsRes, weakTopics, interests, pace, attempts] = await Promise.all([
    supabase
      .from('learning_records')
      .select('record_type, content, topic')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(40)
      .then(r => r.data || [])
      .catch(() => []),
    getWeakTopics(8, 0.6, userId).catch(() => []),
    getUserInterests(userId).catch(() => []),
    getEffectiveLearningPace(userId).catch(() => null),
    moduleId
      ? supabase.from('module_progress').select('attempts').eq('module_id', moduleId).maybeSingle()
          .then(r => r.data?.attempts || 0).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const misconceptions = recordsRes
    .filter(r => r.record_type === 'misconception')
    .slice(0, 6)
    .map(r => r.content);
  const struggleRecs = recordsRes
    .filter(r => r.record_type === 'struggle')
    .map(r => r.topic)
    .filter(Boolean);
  const mastered = recordsRes
    .filter(r => r.record_type === 'mastery')
    .map(r => r.topic)
    .filter(Boolean);

  const weakTopicNames = (weakTopics || [])
    .map(w => (typeof w === 'string' ? w : w.topic))
    .filter(Boolean);

  if (misconceptions.length) state.misconceptions = misconceptions;
  const struggling = [...new Set([...struggleRecs, ...weakTopicNames])];
  if (struggling.length) state.strugglingTopics = struggling.slice(0, 8);
  if (mastered.length) state.masteredTopics = [...new Set(mastered)].slice(0, 8);
  if (Array.isArray(interests) && interests.length) state.preferredAnalogyDomain = interests[0];
  if (pace) state.pace = pace; // 'slow' | 'standard' | 'fast'
  if (attempts) state.attemptNumber = attempts;

  return state;
}

// ── Regeneration ─────────────────────────────────────────────

async function recentRegen(moduleId) {
  try {
    const { data } = await supabase
      .from('module_regenerations')
      .select('created_at, status')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });
    const rows = data || [];
    const total = rows.filter(r => r.status !== 'skipped').length;
    const last = rows[0];
    const tooSoon = last && (Date.now() - new Date(last.created_at).getTime()) < REGEN_COOLDOWN_MS;
    return { total, tooSoon };
  } catch {
    return { total: 0, tooSoon: false };
  }
}

async function archiveCurrentVersion(module, reason, trigger) {
  await supabase.from('module_versions').insert({
    id: uuidv4(),
    module_id: module.id,
    version: module.version || 1,
    title: module.title,
    topic: module.topic,
    outcome: module.outcome || null,
    bloom_level: module.bloomLevel || null,
    objectives: module.objectives || null,
    content: module.content,
    takeaways: module.takeaways || null,
    questions: module.questions || null,
    reason,
    trigger_type: trigger,
  });
}

async function applyRewrite(moduleId, fresh, newVersion, reason) {
  // Swap module fields.
  const { error: upErr } = await supabase
    .from('modules')
    .update({
      content: fresh.content,
      objectives: fresh.objectives || [],
      takeaways: fresh.takeaways || [],
      outcome: fresh.outcome || null,
      bloom_level: fresh.bloomLevel || null,
      version: newVersion,
      regen_reason: reason,
      regenerated_at: new Date().toISOString(),
    })
    .eq('id', moduleId);
  if (upErr) throw upErr;

  // Replace questions with the freshly generated set (which carry misconceptions).
  if (Array.isArray(fresh.questions) && fresh.questions.length) {
    await supabase.from('questions').delete().eq('module_id', moduleId);
    const rows = fresh.questions.map(q => ({
      id: uuidv4(),
      module_id: moduleId,
      type: q.type || 'multiple_choice',
      question: q.question,
      options: q.options || null,
      correct: String(q.correct),
      explanation: q.explanation || null,
      misconception: q.misconception || null,
      topic: q.topic || null,
    }));
    const { error: qErr } = await supabase.from('questions').insert(rows);
    if (qErr) throw qErr;
  }
}

/**
 * Rewrite a single module for a learner. Archives the outgoing version first, so
 * the change is reversible. Returns a result describing what happened; never
 * throws (callers fire this in the background).
 */
async function regenerateModule(moduleId, { userId = null, trigger = 'manual', reason = '', score = null, force = false } = {}) {
  const guard = await recentRegen(moduleId);
  if (!force && guard.tooSoon) return { skipped: 'cooldown' };
  if (!force && guard.total >= REGEN_MAX_TOTAL) return { skipped: 'max_reached' };

  const module = await getModuleById(moduleId);
  if (!module) return { skipped: 'not_found' };

  const fromVersion = module.version || 1;
  const toVersion = fromVersion + 1;
  const auditId = uuidv4();

  await supabase.from('module_regenerations').insert({
    id: auditId,
    module_id: moduleId,
    user_id: userId,
    trigger_type: trigger,
    reason,
    from_version: fromVersion,
    to_version: toVersion,
    score,
    status: 'started',
  });

  try {
    const learnerState = await buildLearnerState(userId, {
      documentId: module.documentId,
      moduleId,
      topic: module.topic,
    });
    // This rewrite is itself another attempt at teaching the same material, so
    // the prompt is told to change approach rather than restate.
    learnerState.attemptNumber = Math.max(2, (learnerState.attemptNumber || 1) + 1);

    const fresh = await regenerateModuleContent(module, userId, { learnerState });

    await archiveCurrentVersion(module, reason, trigger);
    await applyRewrite(moduleId, fresh, toVersion, reason);

    await supabase.from('module_regenerations').update({ status: 'completed' }).eq('id', auditId);

    // Bust the module caches so the learner sees the new version immediately.
    moduleCache.del(`mod:${moduleId}`);
    moduleCache.del(`byDoc:${module.documentId}`);
    moduleCache.del('allModules');

    console.log(`[adaptive] Module ${moduleId.slice(0, 8)} regenerated v${fromVersion}->v${toVersion} (${trigger})`);
    return { regenerated: true, fromVersion, toVersion };
  } catch (err) {
    await supabase.from('module_regenerations')
      .update({ status: 'failed', reason: `${reason} | ${err.message}`.slice(0, 500) })
      .eq('id', auditId);
    console.error(`[adaptive] Regeneration failed for ${moduleId}: ${err.message}`);
    return { error: err.message };
  }
}

// ── Orchestrators (called from controllers) ──────────────────

/**
 * React to a failed comprehension check. Records the misconceptions as durable
 * learning signals, and — if the failure is bad enough and within guard limits —
 * rewrites the module for this learner. Fire-and-forget; safe to not await.
 *
 * @returns {Promise<{ recorded: boolean, regenerating: boolean }>}
 */
async function onQuizFailure(module, score, answers, userId) {
  const { wrongAnswers, struggledTopics, misconceptions } = extractStruggle(module, answers || {});
  if (!wrongAnswers.length) return { recorded: false, regenerating: false };

  // Durable memory: one record per distinct misconception, plus a struggle marker.
  await Promise.all([
    ...misconceptions.slice(0, 6).map((m, i) =>
      recordLearningSignal({
        userId,
        documentId: module.documentId,
        moduleId: module.id,
        topic: wrongAnswers[i]?.topic || module.topic,
        recordType: 'misconception',
        content: m,
        evidence: { score, wrong: wrongAnswers[i] || null },
      })),
    recordLearningSignal({
      userId,
      documentId: module.documentId,
      moduleId: module.id,
      topic: module.topic,
      recordType: 'struggle',
      content: `Scored ${score}% on "${module.title}". Struggled with: ${struggledTopics.join(', ') || module.topic}.`,
      evidence: { score, struggledTopics },
    }),
  ]);

  // Only rewrite on genuine struggle, and let the guards inside regenerateModule
  // enforce cooldown / cap. Runs in the background.
  let regenerating = false;
  if (score < REGEN_SCORE_THRESHOLD) {
    regenerating = true;
    setImmediate(() => {
      regenerateModule(module.id, {
        userId,
        trigger: 'failed_comprehension',
        reason: `Failed comprehension check (${score}%)`,
        score,
      }).catch(err => console.error(`[adaptive] background regen failed: ${err.message}`));
    });
  }

  return { recorded: true, regenerating };
}

/**
 * React to a topic being demonstrably mastered (a high score). Retires stale
 * struggle/misconception records so they stop driving regeneration, and records
 * the mastery so future modules can build on it instead of re-teaching it.
 */
async function onTopicMastered(module, score, userId) {
  if (!userId || !module?.topic) return;
  await resolveRecordsForTopic(userId, module.topic);
  await recordLearningSignal({
    userId,
    documentId: module.documentId,
    moduleId: module.id,
    topic: module.topic,
    recordType: 'mastery',
    content: `Demonstrated mastery of "${module.topic}" (${score}%).`,
    evidence: { score },
  });
}

// ── Lazy quiz generation ─────────────────────────────────────

/**
 * Ensure a module has a full quiz, generating it on first open.
 *
 * Modules ship with a single inline recall question, so generating a course does
 * not pay to write ~5 questions per module that most students never see. The
 * remainder are written here, at the moment the student actually opens the quiz
 * — which is also when the learner model is richest, so distractors can be built
 * from that student's real past mistakes rather than being generic.
 *
 * Idempotent: once a module has a full set, later calls return immediately.
 */
async function ensureFullQuiz(moduleId, userId = null, { force = false } = {}) {
  const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
  const { extractJSON } = require('../utils/jsonHelper');
  const { LAZY_QUIZ_PROMPT, QUIZ_HYGIENE_BLOCK, getQuizDepthSection, buildLearnerStateSection } = require('../utils/prompts');
  const { getUserTeachingLevel } = require('./userProfileService');
  const { FULL_QUIZ_QUESTION_COUNT } = require('./moduleGenerator');

  const module = await getModuleById(moduleId);
  if (!module) throw new Error('Module not found');

  const existing = module.questions || [];
  if (!force && existing.length >= FULL_QUIZ_QUESTION_COUNT) {
    return { generated: false, questions: existing };
  }
  // A module still being written has nothing to quiz on yet.
  if (module.contentStatus && module.contentStatus !== 'ready') {
    return { generated: false, pending: true, questions: existing };
  }

  const [teachingLevel, learnerState] = await Promise.all([
    getUserTeachingLevel(userId).catch(() => 'intermediate'),
    buildLearnerState(userId, { documentId: module.documentId, moduleId, topic: module.topic }),
  ]);

  const alreadyAsked = existing.length
    ? `ALREADY ASKED (do not repeat these):\n${existing.map(q => `- ${q.question}`).join('\n')}\n`
    : '';

  const prompt = LAZY_QUIZ_PROMPT
    .replace('{teaching_level}', teachingLevel)
    .replace('{module_content}', module.content || '')
    .replace('{learner_state_section}', buildLearnerStateSection(learnerState))
    .replace('{already_asked_section}', alreadyAsked)
    .replace('{quiz_depth_section}', getQuizDepthSection(module.content || ''))
    .replace('{quiz_hygiene_section}', QUIZ_HYGIENE_BLOCK)
    .replace('{question_count}', String(FULL_QUIZ_QUESTION_COUNT))
    .replace(/\{topic\}/g, module.topic || module.title || 'this topic');

  const result = await withRetryOnRateLimit(async () => {
    // thinkingBudget 0: reasoning tokens count against maxOutputTokens and would
    // truncate the JSON mid-object. See moduleGenerator.generateModuleBatch.
    const model = getGenerativeModel('fast_lite');
    return model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
    });
  }, 3, 1);

  const parsed = extractJSON(result.response.text());
  const fresh = (parsed?.questions || []).filter(q => q.question);
  if (!fresh.length) {
    // Never leave the student with nothing — keep the inline question.
    console.warn(`[adaptive] Lazy quiz produced no questions for ${moduleId.slice(0, 8)}`);
    return { generated: false, questions: existing };
  }

  const rows = fresh.map(q => {
    const qType = q.type || (q.options ? 'multiple_choice' : 'true_false');
    return {
      id: uuidv4(),
      module_id: moduleId,
      type: qType,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : null,
      correct: String(q.correct ?? (qType === 'true_false' ? 'true' : 'A')),
      explanation: q.explanation || 'Answer based on the module content.',
      misconception: q.misconception || null,
      topic: q.topic || module.topic,
    };
  });

  // Replace wholesale so the inline question is not duplicated by a near-identical
  // generated one; the prompt was told what had already been asked.
  if (existing.length) {
    await supabase.from('questions').delete().eq('module_id', moduleId);
  }
  const { error } = await supabase.from('questions').insert(rows);
  if (error) throw error;

  moduleCache.del(`mod:${moduleId}`);
  moduleCache.del(`byDoc:${module.documentId}`);
  moduleCache.del('allModules');

  console.log(`[adaptive] Lazy quiz generated for ${moduleId.slice(0, 8)} (${rows.length} questions)`);
  const refreshed = await getModuleById(moduleId);
  return { generated: true, questions: refreshed?.questions || [] };
}

// ── Version history + rollback ───────────────────────────────

/** List archived versions of a module (metadata only), newest first. */
async function listModuleVersions(moduleId) {
  const { data, error } = await supabase
    .from('module_versions')
    .select('id, version, reason, trigger_type, created_at')
    .eq('module_id', moduleId)
    .order('version', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Restore a previously archived version. The restore is itself reversible: the
 * current content is archived before the old version is swapped back in, and the
 * module's version number keeps climbing (so history is never lost).
 */
async function restoreModuleVersion(moduleId, versionId, userId = null) {
  const { data: snap, error } = await supabase
    .from('module_versions')
    .select('*')
    .eq('id', versionId)
    .eq('module_id', moduleId)
    .single();
  if (error || !snap) throw new Error('Version not found');

  const current = await getModuleById(moduleId);
  if (!current) throw new Error('Module not found');

  const toVersion = (current.version || 1) + 1;
  const reason = `Restored version ${snap.version}`;

  await archiveCurrentVersion(current, 'Replaced by a restore', 'manual');
  await applyRewrite(moduleId, {
    content: snap.content,
    objectives: snap.objectives || [],
    takeaways: snap.takeaways || [],
    outcome: snap.outcome,
    bloomLevel: snap.bloom_level,
    questions: Array.isArray(snap.questions) ? snap.questions : [],
  }, toVersion, reason);

  await supabase.from('module_regenerations').insert({
    id: uuidv4(),
    module_id: moduleId,
    user_id: userId,
    trigger_type: 'manual',
    reason,
    from_version: current.version || 1,
    to_version: toVersion,
    status: 'completed',
  });

  moduleCache.del(`mod:${moduleId}`);
  moduleCache.del(`byDoc:${current.documentId}`);
  moduleCache.del('allModules');

  return { restored: true, version: toVersion, from: snap.version };
}

module.exports = {
  extractStruggle,
  buildLearnerState,
  recordLearningSignal,
  regenerateModule,
  onQuizFailure,
  onTopicMastered,
  listModuleVersions,
  restoreModuleVersion,
  ensureFullQuiz,
  REGEN_SCORE_THRESHOLD,
};
