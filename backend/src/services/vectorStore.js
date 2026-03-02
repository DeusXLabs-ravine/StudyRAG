const supabase = require('../config/database');
const { generateEmbedding, TaskType } = require('./embeddingService');
const { embeddingCache, documentCache } = require('../config/cache');

/** Strip null bytes and other characters that PostgreSQL text columns reject. */
function sanitizeForPostgres(text) {
  if (!text) return text;
  return text.replace(/\u0000/g, '');
}

// ─── Document CRUD ────────────────────────────────────────────

async function addDocument(docId, metadata) {
  const row = {
    id: docId,
    original_name: metadata.originalName,
    filename: metadata.filename,
    file_path: metadata.filePath,
    cloudinary_public_id: metadata.storagePath || metadata.cloudinaryPublicId || null,
    file_type: metadata.fileType,
    file_size: metadata.fileSize,
    status: metadata.status || 'processing',
    error_message: metadata.error || null,
    upload_date: metadata.uploadDate || new Date().toISOString(),
    processed_date: metadata.processedDate || null,
    chunk_count: metadata.chunkCount || 0,
    extracted_metadata: metadata.extractedMetadata || null,
  };
  if (metadata.userId) row.user_id = metadata.userId;
  if (metadata.sourceType) row.source_type = metadata.sourceType;
  if (metadata.sourceUrl) row.source_url = metadata.sourceUrl;
  if (metadata.sourceContent !== undefined) row.source_content = sanitizeForPostgres(metadata.sourceContent);
  if (metadata.isPrimarySource !== undefined) row.is_primary_source = metadata.isPrimarySource;
  const { error } = await supabase.from('documents').upsert(row);
  if (error) throw error;
  // Invalidate cache
  documentCache.del(`doc:${docId}`);
  documentCache.invalidatePrefix('docs:');
}

async function removeDocument(docId) {
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) throw error;
  documentCache.del(`doc:${docId}`);
  documentCache.invalidatePrefix('docs:');
}

// ─── Chunks ───────────────────────────────────────────────────

async function addChunks(docId, chunks) {
  const rows = chunks.map(chunk => ({
    id: chunk.id,
    doc_id: docId,
    text: chunk.text,
    heading: chunk.heading || null,
    embedding: JSON.stringify(chunk.embedding),
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('chunks').insert(batch);
    if (error) throw error;
  }
}

/**
 * Vector similarity search with embedding caching.
 * Same query text produces the same embedding — cache it.
 */
async function search(query, topK = 5, docId = null) {
  // Check embedding cache
  const embCacheKey = `emb:${query}`;
  let queryEmbedding = embeddingCache.get(embCacheKey);
  if (!queryEmbedding) {
    queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY);
    embeddingCache.set(embCacheKey, queryEmbedding);
  }

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    filter_doc_id: docId || null,
  });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    docId: row.doc_id,
    text: row.text,
    heading: row.heading,
    score: row.score,
  }));
}

async function getDocumentChunks(docId) {
  const { data, error } = await supabase
    .from('chunks')
    .select('id, doc_id, text, heading')
    .eq('doc_id', docId);
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    docId: row.doc_id,
    text: row.text,
    heading: row.heading,
  }));
}

async function getAllChunksWithText() {
  const { data, error } = await supabase
    .from('chunks')
    .select('id, doc_id, text, heading');
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    docId: row.doc_id,
    text: row.text,
    heading: row.heading,
  }));
}

// ─── Page Index (vectorless RAG) ──────────────────────────────

async function addPages(docId, pages) {
  const rows = pages.map(page => ({
    id: page.id || require('uuid').v4(),
    doc_id: docId,
    page_number: page.pageNumber,
    text: sanitizeForPostgres(page.text),
    heading: sanitizeForPostgres(page.heading) || null,
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('pages').insert(batch);
    if (error) throw error;
  }
}

async function addPageIndex(docId, treeJson, pageCount) {
  const { error } = await supabase
    .from('page_index')
    .upsert({ doc_id: docId, tree_json: treeJson, page_count: pageCount });
  if (error) throw error;
  documentCache.del(`pageIdx:${docId}`);
  documentCache.invalidatePrefix('allPageIdx');
}

async function getPageIndex(docId) {
  const cacheKey = `pageIdx:${docId}`;
  const cached = documentCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('page_index')
    .select('*')
    .eq('doc_id', docId)
    .single();

  if (error && error.code === 'PGRST116') {
    documentCache.set(cacheKey, null);
    return null;
  }
  if (error) throw error;
  const result = { docId: data.doc_id, treeJson: data.tree_json, pageCount: data.page_count };
  documentCache.set(cacheKey, result);
  return result;
}

async function getPages(docId, pageNumbers) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('doc_id', docId)
    .in('page_number', pageNumbers)
    .order('page_number', { ascending: true });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    docId: row.doc_id,
    pageNumber: row.page_number,
    text: row.text,
    heading: row.heading,
  }));
}

async function getDocumentPages(docId) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('doc_id', docId)
    .order('page_number', { ascending: true });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    docId: row.doc_id,
    pageNumber: row.page_number,
    text: row.text,
    heading: row.heading,
  }));
}

/**
 * Get all page indexes — cached to avoid repeated full-table scans.
 */
async function getAllPageIndexes(userId = null) {
  const cacheKey = `allPageIdx:${userId || 'all'}`;
  const cached = documentCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // If userId provided, only get indexes for that user's documents
  let data, error;
  if (userId) {
    const docRes = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId);
    if (docRes.error) throw docRes.error;
    const docIds = (docRes.data || []).map(d => d.id);
    if (docIds.length === 0) {
      documentCache.set(cacheKey, [], 5 * 60_000);
      return [];
    }
    const res = await supabase
      .from('page_index')
      .select('doc_id, tree_json, page_count')
      .in('doc_id', docIds);
    data = res.data;
    error = res.error;
  } else {
    const res = await supabase
      .from('page_index')
      .select('doc_id, tree_json, page_count');
    data = res.data;
    error = res.error;
  }
  if (error) throw error;

  const result = (data || []).map(row => ({
    docId: row.doc_id,
    treeJson: row.tree_json,
    pageCount: row.page_count,
  }));
  documentCache.set(cacheKey, result, 5 * 60_000);
  return result;
}

async function deletePages(docId) {
  const { error: pagesErr } = await supabase.from('pages').delete().eq('doc_id', docId);
  if (pagesErr) throw pagesErr;
  const { error: indexErr } = await supabase.from('page_index').delete().eq('doc_id', docId);
  if (indexErr) throw indexErr;
  documentCache.del(`pageIdx:${docId}`);
  documentCache.invalidatePrefix('allPageIdx');
}

// ─── Documents ────────────────────────────────────────────────

async function getAllDocuments(userId = null) {
  const cacheKey = `docs:${userId || 'all'}`;
  const cached = documentCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const query = supabase
    .from('documents')
    .select('*')
    .order('upload_date', { ascending: false });
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;

  const result = (data || []).map(formatDoc);
  documentCache.set(cacheKey, result, 2 * 60_000); // 2 min
  return result;
}

/**
 * Get a single document — cached.
 */
async function getDocument(docId) {
  const cacheKey = `doc:${docId}`;
  const cached = documentCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (error && error.code === 'PGRST116') {
    documentCache.set(cacheKey, null);
    return null;
  }
  if (error) throw error;
  const result = formatDoc(data);
  documentCache.set(cacheKey, result);
  return result;
}

/**
 * Batch get multiple documents by ID — eliminates N+1 queries.
 * Returns a Map<docId, document> for O(1) lookups.
 */
async function getDocumentsBatch(docIds) {
  if (!docIds || docIds.length === 0) return new Map();

  // Check cache first
  const result = new Map();
  const uncached = [];
  for (const id of docIds) {
    const cached = documentCache.get(`doc:${id}`);
    if (cached !== undefined) {
      result.set(id, cached);
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length > 0) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', uncached);
    if (error) throw error;

    for (const row of (data || [])) {
      const doc = formatDoc(row);
      documentCache.set(`doc:${row.id}`, doc);
      result.set(row.id, doc);
    }
  }

  return result;
}

async function getStats() {
  const [docRes, chunkRes] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('chunks').select('*', { count: 'exact', head: true }),
  ]);
  if (docRes.error) throw docRes.error;
  if (chunkRes.error) throw chunkRes.error;
  return { documentCount: docRes.count || 0, chunkCount: chunkRes.count || 0 };
}

function formatDoc(row) {
  return {
    id: row.id,
    originalName: row.original_name,
    filename: row.filename,
    filePath: row.file_path,
    storagePath: row.cloudinary_public_id,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    error: row.error_message,
    uploadDate: row.upload_date,
    processedDate: row.processed_date,
    chunkCount: row.chunk_count,
    extractedMetadata: row.extracted_metadata,
    sourceType: row.source_type || 'file',
    sourceUrl: row.source_url || null,
    isPrimarySource: row.is_primary_source || false,
  };
}

async function updateDocumentStatus(docId, fields) {
  const update = {};
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.processedDate !== undefined) update.processed_date = fields.processedDate;
  if (fields.chunkCount !== undefined) update.chunk_count = fields.chunkCount;
  if (fields.extractedMetadata !== undefined) update.extracted_metadata = fields.extractedMetadata;
  if (fields.error !== undefined) update.error_message = fields.error;
  if (fields.isPrimarySource !== undefined) update.is_primary_source = fields.isPrimarySource;

  const { error } = await supabase.from('documents').update(update).eq('id', docId);
  if (error) throw error;
  // Invalidate caches
  documentCache.del(`doc:${docId}`);
  documentCache.invalidatePrefix('docs:');
}

module.exports = {
  addDocument,
  removeDocument,
  addChunks,
  search,
  getDocumentChunks,
  getAllChunksWithText,
  getAllDocuments,
  getDocument,
  getDocumentsBatch,
  getStats,
  updateDocumentStatus,
  addPages,
  addPageIndex,
  getPageIndex,
  getPages,
  getDocumentPages,
  getAllPageIndexes,
  deletePages,
};
