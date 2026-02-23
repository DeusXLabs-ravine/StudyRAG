const supabase = require('../config/database');
const { queryWithRAG } = require('../services/ragService');
const { v4: uuidv4 } = require('uuid');

async function queryChat(req, res, next) {
  try {
    const { query, documentId } = req.body;
    const userId = req.user?.id || null;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load recent conversation context (scoped by user)
    const histQuery = supabase
      .from('chat_messages')
      .select('query, answer')
      .order('timestamp', { ascending: false })
      .limit(5);
    if (userId) histQuery.eq('user_id', userId);

    const { data: recentRows } = await histQuery;
    const recentMessages = (recentRows || []).reverse();

    const { answer, sources } = await queryWithRAG(query, documentId || null, recentMessages, userId);

    const message = {
      id: uuidv4(),
      query,
      answer,
      sources,
      documentId: documentId || null,
      timestamp: new Date().toISOString(),
    };

    // Persist to Supabase
    const msgRow = {
      id: message.id,
      query: message.query,
      answer: message.answer,
      sources_json: message.sources,
      document_id: message.documentId,
      timestamp: message.timestamp,
    };
    if (userId) msgRow.user_id = userId;
    const { error: msgErr } = await supabase.from('chat_messages').insert(msgRow);
    if (msgErr) throw msgErr;

    // Record study session
    const sessRow = { mode: 'chat', details_json: { messageId: message.id } };
    if (userId) sessRow.user_id = userId;
    const { error: sessErr } = await supabase.from('study_sessions').insert(sessRow);
    if (sessErr) throw sessErr;

    res.json(message);
  } catch (error) {
    next(error);
  }
}

async function getChatHistory(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const query = supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    if (userId) query.eq('user_id', userId);

    const { data: rows, error } = await query;
    if (error) throw error;

    const messages = (rows || []).reverse().map(row => ({
      id: row.id,
      query: row.query,
      answer: row.answer,
      sources: row.sources_json || [],
      documentId: row.document_id,
      timestamp: row.timestamp,
    }));
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

async function clearChatHistory(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const query = supabase
      .from('chat_messages')
      .delete()
      .neq('id', '');
    if (userId) query.eq('user_id', userId);

    const { error } = await query;
    if (error) throw error;
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    next(error);
  }
}

module.exports = { queryChat, getChatHistory, clearChatHistory };
