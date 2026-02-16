const express = require('express');
const router = express.Router();
const { listModules, getModule, updateProgress, regenerateQuestions } = require('../controllers/moduleController');
const { explainSimply } = require('../services/ragService');

router.get('/', listModules);
router.get('/:id', getModule);
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
    const explanation = await explainSimply(mod.content, question || '');
    res.json({ explanation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
