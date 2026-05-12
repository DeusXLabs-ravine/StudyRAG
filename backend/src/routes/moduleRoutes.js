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
