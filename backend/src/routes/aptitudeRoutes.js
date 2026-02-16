const express = require('express');
const router = express.Router();
const { createAptitudeTest, submitTest, listHistory, getLatest } = require('../controllers/aptitudeController');

router.post('/generate', createAptitudeTest);
router.post('/submit', submitTest);
router.get('/history', listHistory);
router.get('/latest', getLatest);

module.exports = router;
