const supabase = require('../config/database');
const { generateEmbedding, TaskType } = require('./embeddingService');

async function addDocument(docId, metadata) {
  const { error } = await supabase
    .from('documents')
    .upsert({
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
    });
  if (error) throw error;
}

async function removeDocument(docId) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);
  if (error) throw error;
}

async function addChunks(docId, chunks) {
  const rows = chunks.map(chunk => ({
    id: chunk.id,
    doc_id: docId,
    text: chunk.text,
    heading: chunk.heading || null,
    embedding: JSON.stringify(chunk.embedding),
  }));

  // Batch inserts in groups of 50 to keep payloads under PostgREST limits
  // (each embedding is ~12KB serialized, 50 * 12KB ≈ 600KB per batch)
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('chunks').insert(batch);
    if (error) throw error;
  }
}

async function search(query, topK = 5, docId = null) {
  const queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY);

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

async function getAllDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('upload_date', { ascending: false });
  if (error) throw error;

  return (data || []).map(formatDoc);
}

async function getDocument(docId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return formatDoc(data);
}

async function getStats() {
  const { count: documentCount, error: docErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (docErr) throw docErr;

  const { count: chunkCount, error: chunkErr } = await supabase
    .from('chunks')
    .select('*', { count: 'exact', head: true });
  if (chunkErr) throw chunkErr;

  return { documentCount: documentCount || 0, chunkCount: chunkCount || 0 };
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
  };
}

async function updateDocumentStatus(docId, fields) {
  const update = {};
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.processedDate !== undefined) update.processed_date = fields.processedDate;
  if (fields.chunkCount !== undefined) update.chunk_count = fields.chunkCount;
  if (fields.extractedMetadata !== undefined) update.extracted_metadata = fields.extractedMetadata;
  if (fields.error !== undefined) update.error_message = fields.error;

  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', docId);
  if (error) throw error;
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
  getStats,
  updateDocumentStatus,
};
