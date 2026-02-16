const express = require('express');
const router = express.Router();
const { createQuiz, submitQuizAnswers, listQuizHistory } = require('../controllers/quizController');

router.post('/generate', createQuiz);
router.post('/submit', submitQuizAnswers);
router.get('/history', listQuizHistory);

module.exports = router;
