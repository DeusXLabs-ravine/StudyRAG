const supabase = require('../config/database');
const { queryWithRAG, queryWithRAGStream } = require('../services/ragService');
const { v4: uuidv4 } = require('uuid');

async function queryChat(req, res, next) {
  try {
    const { query, documentId } = req.body;
    const userId = req.user?.id || null;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load recent conversation context in parallel with nothing blocking —
    // start history fetch, then pass it into RAG
    const histQuery = supabase
      .from('chat_messages')
      .select('query, answer')
      .order('timestamp', { ascending: false })
      .limit(5);
    if (userId) histQuery.eq('user_id', userId);

    const { data: recentRows } = await histQuery;
    const recentMessages = (recentRows || []).reverse();

    const { answer, sources, webSources } = await queryWithRAG(query, documentId || null, recentMessages, userId);

    const message = {
      id: uuidv4(),
      query,
      answer,
      sources,
      webSources: webSources || [],
      documentId: documentId || null,
      timestamp: new Date().toISOString(),
    };

    // Persist chat message + study session in parallel, and respond immediately
    const msgRow = {
      id: message.id,
      query: message.query,
      answer: message.answer,
      sources_json: message.sources,
      document_id: message.documentId,
      timestamp: message.timestamp,
    };
    if (userId) msgRow.user_id = userId;

    const sessRow = { mode: 'chat', details_json: { messageId: message.id } };
    if (userId) sessRow.user_id = userId;

    // Send response first, persist in background (non-blocking)
    res.json(message);

    // Fire-and-forget DB writes in parallel
    Promise.all([
      supabase.from('chat_messages').insert(msgRow),
      supabase.from('study_sessions').insert(sessRow),
    ]).catch(err => console.error('[Chat] Background persist error:', err));
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

/**
 * Streaming chat endpoint (SSE).
 * Emits text chunks as they arrive from Gemini, then a final 'done' event with sources.
 * Falls back gracefully to non-streaming for web-search queries or vector-only docs.
 */
async function streamQuery(req, res, next) {
  const { query, documentId } = req.body;
  const userId = req.user?.id || null;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // SSE headers — disable compression for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const writeEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Fetch conversation history
    const histQuery = supabase
      .from('chat_messages')
      .select('query, answer')
      .order('timestamp', { ascending: false })
      .limit(5);
    if (userId) histQuery.eq('user_id', userId);
    const { data: recentRows } = await histQuery;
    const recentMessages = (recentRows || []).reverse();

    let fullAnswer = '';
    let finalSources = [];
    let finalWebSources = [];
    let finalSuggestSolver = false;
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    for await (const event of queryWithRAGStream(query, documentId || null, recentMessages, userId)) {
      if (event.type === 'text') {
        fullAnswer += event.text;
        writeEvent(event);
      } else if (event.type === 'done') {
        finalSources = event.sources || [];
        finalWebSources = event.webSources || [];
        finalSuggestSolver = event.suggestSolver || false;
        writeEvent({ type: 'done', id: messageId, timestamp, sources: finalSources, webSources: finalWebSources, suggestSolver: finalSuggestSolver });
      }
    }

    res.end();

    // Persist in background (fire-and-forget)
    const msgRow = {
      id: messageId,
      query,
      answer: fullAnswer,
      sources_json: finalSources,
      document_id: documentId || null,
      timestamp,
    };
    if (userId) msgRow.user_id = userId;
    const sessRow = { mode: 'chat', details_json: { messageId } };
    if (userId) sessRow.user_id = userId;
    Promise.all([
      supabase.from('chat_messages').insert(msgRow),
      supabase.from('study_sessions').insert(sessRow),
    ]).catch(err => console.error('[Chat] Background persist error:', err));

  } catch (error) {
    writeEvent({ type: 'error', message: error.message || 'An error occurred' });
    res.end();
  }
}

module.exports = { queryChat, streamQuery, getChatHistory, clearChatHistory };
