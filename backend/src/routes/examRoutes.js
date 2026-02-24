const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const {
  generateExam,
  submitExam,
  getExamHistory,
  createPrepSession,
  listPrepSessions,
  getPrepSession,
  deletePrepSession,
  addPrepMaterial,
  startPrepGeneration,
  generatePrepPracticeExam,
} = require('../controllers/examController');

// Existing exam endpoints
router.post('/generate', generateExam);
router.post('/submit', submitExam);
router.get('/history', getExamHistory);

// Exam prep endpoints
router.post('/prep', createPrepSession);
router.get('/prep', listPrepSessions);
router.get('/prep/:sessionId', getPrepSession);
router.delete('/prep/:sessionId', deletePrepSession);
router.post('/prep/:sessionId/materials', upload.single('file'), addPrepMaterial);
router.post('/prep/:sessionId/generate', startPrepGeneration);
router.post('/prep/:sessionId/practice-exam', generatePrepPracticeExam);

module.exports = router;
