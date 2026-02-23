const { generateQuiz, submitQuiz, getQuizHistory } = require('../services/quizGenerator');

async function createQuiz(req, res, next) {
  try {
    const { numQuestions = 10, difficulty = 'medium', documentId, adaptive = false } = req.body;
    const quiz = await generateQuiz({
      numQuestions,
      difficulty,
      docId: documentId,
      adaptive,
      userId: req.user?.id || null,
    });
    res.json(quiz);
  } catch (error) {
    next(error);
  }
}

async function submitQuizAnswers(req, res, next) {
  try {
    const { quizId, answers, questions, timeSpentSeconds } = req.body;

    if (!answers || !questions) {
      return res.status(400).json({ error: 'Answers and questions are required' });
    }

    const result = await submitQuiz(quizId, answers, questions, timeSpentSeconds, req.user?.id || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listQuizHistory(req, res, next) {
  try {
    const history = await getQuizHistory(req.user?.id || null);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

module.exports = { createQuiz, submitQuizAnswers, listQuizHistory };
