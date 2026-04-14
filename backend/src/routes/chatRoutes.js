const express = require('express');
const router = express.Router();
const { queryChat, streamQuery, getChatHistory, clearChatHistory } = require('../controllers/chatController');
const { enforceUsageCap } = require('../middleware/tierAuth');

router.post('/query', enforceUsageCap('chats'), queryChat);
router.post('/stream', enforceUsageCap('chats'), streamQuery);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

module.exports = router;
