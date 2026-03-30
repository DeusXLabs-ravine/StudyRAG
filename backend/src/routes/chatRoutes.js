const express = require('express');
const router = express.Router();
const { queryChat, streamQuery, getChatHistory, clearChatHistory } = require('../controllers/chatController');

router.post('/query', queryChat);
router.post('/stream', streamQuery);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

module.exports = router;
