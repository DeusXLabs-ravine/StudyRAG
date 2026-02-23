const { generateAptitudeTest, submitAptitudeTest, getAptitudeHistory, getLatestAptitude } = require('../services/aptitudeService');

async function createAptitudeTest(req, res, next) {
  try {
    const { subject } = req.body;
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    const test = await generateAptitudeTest(subject.trim());
    res.json(test);
  } catch (error) {
    next(error);
  }
}

async function submitTest(req, res, next) {
  try {
    const { subject, answers, questions } = req.body;
    if (!answers || !questions) {
      return res.status(400).json({ error: 'Answers and questions are required' });
    }
    const result = await submitAptitudeTest(subject, answers, questions, req.user?.id || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listHistory(req, res, next) {
  try {
    const history = await getAptitudeHistory(req.user?.id || null);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

async function getLatest(req, res, next) {
  try {
    const latest = await getLatestAptitude(req.user?.id || null);
    res.json({ result: latest });
  } catch (error) {
    next(error);
  }
}

module.exports = { createAptitudeTest, submitTest, listHistory, getLatest };
