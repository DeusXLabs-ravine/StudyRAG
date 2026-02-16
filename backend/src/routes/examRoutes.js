const express = require('express');
const router = express.Router();
const { generateExam, submitExam, getExamHistory } = require('../controllers/examController');

router.post('/generate', generateExam);
router.post('/submit', submitExam);
router.get('/history', getExamHistory);

module.exports = router;
