const express = require('express');
const router = express.Router();
const { listModules, getModule, updateProgress, regenerateQuestions } = require('../controllers/moduleController');
const { explainSimply, tutorGreeting, tutorChat } = require('../services/ragService');
const { cacheResponse } = require('../middleware/responseCache');
const { enforceUsageCap } = require('../middleware/tierAuth');

router.get('/', cacheResponse(60_000), listModules);        // 1 min cache
router.get('/:id', cacheResponse(2 * 60_000), getModule);   // 2 min cache
router.put('/:id/progress', updateProgress);
router.post('/:id/regenerate-questions', regenerateQuestions);

// Progressive generation: a student opening a not-yet-written module bumps it
// to the front of the fill queue, so nobody waits on lessons they don't want.
router.post('/:id/prioritize', async (req, res, next) => {
  try {
    const { prioritizeModule } = require('../services/progressiveCourseService');
    res.json(await prioritizeModule(req.params.id));
  } catch (error) { next(error); }
});

// Re-generate a module whose content generation failed. Writes directly rather
// than re-queueing, because the background workers have already exited by then.
router.post('/:id/retry', async (req, res, next) => {
  try {
    const { retryModule } = require('../services/progressiveCourseService');
    res.json(await retryModule(req.params.id));
  } catch (error) { next(error); }
});

// Full quiz, generated on first open (modules ship with one inline question).
router.post('/:id/quiz', async (req, res, next) => {
  try {
    const { ensureFullQuiz } = require('../services/adaptiveLearningService');
    res.json(await ensureFullQuiz(req.params.id, req.user?.id || null));
  } catch (error) { next(error); }
});

// Adaptive learning: version history + rewrite controls
router.get('/:id/versions', async (req, res, next) => {
  try {
    const { listModuleVersions } = require('../services/adaptiveLearningService');
    res.json({ versions: await listModuleVersions(req.params.id) });
  } catch (error) { next(error); }
});

router.post('/:id/versions/:versionId/restore', async (req, res, next) => {
  try {
    const { restoreModuleVersion } = require('../services/adaptiveLearningService');
    const { getModuleById } = require('../services/moduleGenerator');
    const result = await restoreModuleVersion(req.params.id, req.params.versionId, req.user?.id || null);
    const module = await getModuleById(req.params.id);
    res.json({ ...result, module });
  } catch (error) { next(error); }
});

// Manually ask Sage to re-teach this module differently (student-initiated "redo")
router.post('/:id/rewrite', async (req, res, next) => {
  try {
    const { regenerateModule } = require('../services/adaptiveLearningService');
    const result = await regenerateModule(req.params.id, {
      userId: req.user?.id || null,
      trigger: 'manual_redo',
      reason: (req.body && req.body.reason) || 'Student asked to re-teach this lesson',
      force: false,
    });
    res.json(result);
  } catch (error) { next(error); }
});

// "I don't understand" - get simplified explanation
router.post('/:id/explain', async (req, res, next) => {
  try {
    const { getModuleById } = require('../services/moduleGenerator');
    const mod = await getModuleById(req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const { question } = req.body;
    const explanation = await explainSimply(mod.content, question || '', req.user?.id);
    res.json({ explanation });
  } catch (error) {
    next(error);
  }
});

// Sage tutor — greeting (counts as 1 teach session against the monthly cap)
router.post('/:id/tutor/greeting', enforceUsageCap('teach'), async (req, res, next) => {
  try {
    const { getModuleById } = require('../services/moduleGenerator');
    const mod = await getModuleById(req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const greeting = await tutorGreeting(mod.content, mod.title, mod.topic, req.user?.id);
    res.json({ greeting });
  } catch (error) {
    next(error);
  }
});

// Sage tutor — chat
router.post('/:id/tutor/chat', async (req, res, next) => {
  try {
    const { getModuleById } = require('../services/moduleGenerator');
    const mod = await getModuleById(req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const { message, conversationHistory } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    // Truncate history to last 10 exchanges (20 messages)
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-20)
      : [];
    const result = await tutorChat(mod.content, mod.title, mod.topic, message, history, req.user?.id);
    // tutorChat returns { reply, webSources }
    res.json({ reply: result.reply, webSources: result.webSources || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
