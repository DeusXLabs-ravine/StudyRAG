const express = require('express');
const { speak, listVoices } = require('../controllers/ttsController');

const router = express.Router();

router.get('/voices', listVoices);
router.post('/speak', speak);

module.exports = router;
