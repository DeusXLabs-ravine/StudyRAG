const { generateQuiz, submitQuiz, getQuizHistory } = require('../services/quizGenerator');

async function generateExam(req, res, next) {
  try {
    const {
      numQuestions = 20,
      difficulty = 'medium',
      documentId,
      timeLimitMinutes = 30,
    } = req.body;

    const exam = await generateQuiz({
      numQuestions,
      difficulty,
      docId: documentId,
      adaptive: true,
      isExam: true,
      timeLimitSeconds: timeLimitMinutes * 60,
    });

    res.json(exam);
  } catch (error) {
    next(error);
  }
}

async function submitExam(req, res, next) {
  try {
    const { quizId, answers, questions, timeSpentSeconds } = req.body;

    if (!answers || !questions) {
      return res.status(400).json({ error: 'Answers and questions are required' });
    }

    const result = await submitQuiz(quizId, answers, questions, timeSpentSeconds);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getExamHistory(req, res, next) {
  try {
    const history = (await getQuizHistory()).filter(h => h.isExam);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

module.exports = { generateExam, submitExam, getExamHistory };
