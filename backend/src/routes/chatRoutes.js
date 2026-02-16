const express = require('express');
const router = express.Router();
const { queryChat, getChatHistory, clearChatHistory } = require('../controllers/chatController');

router.post('/query', queryChat);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

module.exports = router;
