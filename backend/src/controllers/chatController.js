const supabase = require('../config/database');
const { queryWithRAG } = require('../services/ragService');
const { v4: uuidv4 } = require('uuid');

async function queryChat(req, res, next) {
  try {
    const { query, documentId } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load recent conversation context
    const { data: recentRows } = await supabase
      .from('chat_messages')
      .select('query, answer')
      .order('timestamp', { ascending: false })
      .limit(5);
    const recentMessages = (recentRows || []).reverse();

    const { answer, sources } = await queryWithRAG(query, documentId || null, recentMessages);

    const message = {
      id: uuidv4(),
      query,
      answer,
      sources,
      documentId: documentId || null,
      timestamp: new Date().toISOString(),
    };

    // Persist to Supabase
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      id: message.id,
      query: message.query,
      answer: message.answer,
      sources_json: message.sources,
      document_id: message.documentId,
      timestamp: message.timestamp,
    });
    if (msgErr) throw msgErr;

    // Record study session
    const { error: sessErr } = await supabase.from('study_sessions').insert({
      mode: 'chat',
      details_json: { messageId: message.id },
    });
    if (sessErr) throw sessErr;

    res.json(message);
  } catch (error) {
    next(error);
  }
}

async function getChatHistory(req, res, next) {
  try {
    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
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
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '');
    if (error) throw error;
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    next(error);
  }
}

module.exports = { queryChat, getChatHistory, clearChatHistory };
