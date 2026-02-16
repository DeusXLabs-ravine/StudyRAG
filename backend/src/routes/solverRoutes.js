const express = require('express');
const router = express.Router();
const { solve, followUp, history } = require('../controllers/solverController');

router.post('/solve', solve);
router.post('/followup', followUp);
router.get('/history', history);

module.exports = router;
