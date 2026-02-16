const { v4: uuidv4 } = require('uuid');
const { extractTextFromBuffer } = require('../services/fileProcessor');
const { chunkText } = require('../services/chunkingService');
const { generateEmbeddings } = require('../services/embeddingService');
const vectorStore = require('../services/vectorStore');
const { generateModules, deleteModulesByDocument, enrichModulesWithResources } = require('../services/moduleGenerator');
const { researchDocument, getResourcesByDocument, deleteResourcesByDocument } = require('../services/webResearchService');
const supabase = require('../config/database');
const { allowedFileTypes } = require('../config/env');
const path = require('path');

const STORAGE_BUCKET = 'documents';

/**
 * Ensure the Supabase Storage bucket exists (lazy, runs once).
 */
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;

  // Check if bucket already exists
  const { data: existing } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
    });
    if (error) throw error;
  }

  bucketReady = true;
}

/**
 * Build a sanitised storage path for a file.
 */
function buildStoragePath(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${uuidv4()}_${base}${ext}`;
}

/**
 * Legacy upload endpoint (multer buffer → Supabase Storage).
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docId = uuidv4();
    const { file } = req;
    const ext = path.extname(file.originalname).toLowerCase();

    await ensureBucket();
    const storagePath = buildStoragePath(file.originalname);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    await vectorStore.addDocument(docId, {
      originalName: file.originalname,
      filename: storagePath,
      filePath: storagePath,
      storagePath,
      fileType: ext,
      fileSize: file.size,
      status: 'processing',
      uploadDate: new Date().toISOString(),
    });

    res.status(202).json({
      id: docId,
      originalName: file.originalname,
      status: 'processing',
      message: 'Document uploaded. Processing started.',
    });

    processDocumentFromBuffer(docId, file.buffer, ext).catch(async (err) => {
      console.error(`Error processing document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

async function processDocumentFromBuffer(docId, buffer, ext) {
  const t = Date.now();
  const { text, metadata } = await extractTextFromBuffer(buffer, ext);
  console.log(`[Pipeline ${docId.slice(0, 8)}] Text extraction: ${((Date.now() - t) / 1000).toFixed(1)}s (${text.length} chars)`);
  await runProcessingPipeline(docId, text, metadata);
}

/**
 * Download a single chunk from Supabase Storage with retry.
 */
async function downloadChunk(storagePath) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);
      if (error) throw new Error(`Storage download error: ${error.message}`);
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastErr = err;
      console.warn(`Download attempt ${attempt + 1}/3 failed for ${storagePath}: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Download file(s) from Supabase Storage, concatenate if chunked, then process.
 * @param {string} docId
 * @param {string|string[]} storagePaths - single path or ordered array of chunk paths
 * @param {string} ext - file extension
 */
async function processDocumentFromStorage(docId, storagePaths, ext) {
  const paths = Array.isArray(storagePaths) ? storagePaths : [storagePaths];
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;

  // Download all chunks in parallel
  const t0 = Date.now();
  const buffers = await Promise.all(paths.map(p => downloadChunk(p)));
  const buffer = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
  console.log(`${prefix} Storage download: ${((Date.now() - t0) / 1000).toFixed(1)}s (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${paths.length} chunk(s))`);

  // Extract text
  const t1 = Date.now();
  const { text, metadata } = await extractTextFromBuffer(buffer, ext);
  console.log(`${prefix} Text extraction: ${((Date.now() - t1) / 1000).toFixed(1)}s (${text.length} chars)`);

  return await runProcessingPipeline(docId, text, metadata);
}

async function runProcessingPipeline(docId, text, metadata) {
  const pipelineStart = Date.now();
  const log = (step, startTime) =>
    console.log(`[Pipeline ${docId.slice(0, 8)}] ${step}: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Chunk text (CPU-only, fast)
  const chunks = chunkText(text);
  const texts = chunks.map(c => c.text);
  console.log(`[Pipeline ${docId.slice(0, 8)}] Document: ${text.length} chars → ${chunks.length} chunks`);

  // Three-way parallelization: embedding+store, module generation, and web research
  // are all independent — none depend on the others' output
  const [embeddingResult, modulesResult, researchResult] = await Promise.allSettled([
    // Pipeline A: Generate embeddings → store in vector DB
    (async () => {
      const t = Date.now();
      const embeddings = await generateEmbeddings(texts);
      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        id: uuidv4(),
        text: chunk.text,
        heading: chunk.heading,
        embedding: embeddings[i],
      }));
      await vectorStore.addChunks(docId, chunksWithEmbeddings);
      log('Embeddings + store', t);
      return chunksWithEmbeddings.length;
    })(),
    // Pipeline B: Generate learning modules (LLM call — slowest step)
    (async () => {
      const t = Date.now();
      const result = await generateModules(docId, text);
      log('Module generation', t);
      return result;
    })(),
    // Pipeline C: Extract topics + search for supplementary resources
    (async () => {
      const t = Date.now();
      const result = await researchDocument(docId, text);
      log('Web research', t);
      return result;
    })(),
  ]);

  // Embedding failures are critical (needed for search/RAG)
  if (embeddingResult.status === 'rejected') {
    throw embeddingResult.reason;
  }

  // Module generation is critical
  if (modulesResult.status === 'rejected') {
    throw modulesResult.reason;
  }

  // Enrich modules with research results (only if research succeeded)
  if (researchResult.status === 'fulfilled') {
    try {
      const t = Date.now();
      await enrichModulesWithResources(docId);
      log('Enrichment', t);
    } catch (enrichErr) {
      console.error(`Module enrichment failed for document ${docId}:`, enrichErr.message);
    }
  } else {
    console.error(`Web research failed for document ${docId}:`, researchResult.reason?.message);
  }

  // Update document status — targeted update instead of full read+upsert
  await vectorStore.updateDocumentStatus(docId, {
    status: 'ready',
    processedDate: new Date().toISOString(),
    chunkCount: chunks.length,
    extractedMetadata: metadata,
  });

  log('TOTAL PIPELINE', pipelineStart);
}

async function listDocuments(req, res, next) {
  try {
    const documents = await vectorStore.getAllDocuments();
    res.json({ documents });
  } catch (error) {
    next(error);
  }
}

async function getDocument(req, res, next) {
  try {
    const doc = await vectorStore.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await vectorStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Supabase Storage
    if (doc.storagePath) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);
      } catch (storageErr) {
        console.error(`Failed to delete from storage: ${storageErr.message}`);
        // Non-blocking: proceed with DB cleanup even if storage delete fails
      }
    }

    // Remove from vector store and modules
    await vectorStore.removeDocument(id);
    await deleteModulesByDocument(id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function reprocessDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await vectorStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Guard against documents without a storage path
    if (!doc.storagePath) {
      return res.status(400).json({
        error: 'This document was uploaded before the storage migration. Please delete and re-upload it.',
      });
    }

    // Reset status
    await vectorStore.addDocument(id, { ...doc, id: undefined, status: 'processing' });

    // Remove old chunks and modules
    await vectorStore.removeDocument(id);
    await vectorStore.addDocument(id, { ...doc, id: undefined, status: 'processing' });
    await deleteModulesByDocument(id);
    await deleteResourcesByDocument(id);

    res.json({ message: 'Reprocessing started', status: 'processing' });

    // Download from Supabase Storage and reprocess
    processDocumentFromStorage(id, doc.storagePath, doc.fileType).catch(async (err) => {
      console.error(`Error reprocessing document ${id}:`, err);
      await vectorStore.updateDocumentStatus(id, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

async function getDocumentResources(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await vectorStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const resources = await getResourcesByDocument(id);
    res.json({ resources });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a Supabase Storage signed upload URL so the frontend can upload directly.
 */
async function signUpload(req, res, next) {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    // For chunked uploads, filename may be "file.pdf.part0" — validate the real extension
    const realFilename = filename.replace(/\.part\d+$/, '');
    const ext = path.extname(realFilename).toLowerCase().slice(1);
    if (!allowedFileTypes.includes(ext)) {
      return res.status(400).json({
        error: `File type .${ext} is not allowed. Allowed: ${allowedFileTypes.join(', ')}`,
      });
    }

    await ensureBucket();
    const storagePath = buildStoragePath(filename);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error) throw error;

    res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a document that was uploaded directly to Supabase Storage from the frontend.
 */
async function registerDocument(req, res, next) {
  try {
    const { storagePath, storagePaths, originalName, fileSize, fileType } = req.body;

    // Support both single storagePath and chunked storagePaths array
    const paths = storagePaths || (storagePath ? [storagePath] : null);
    if (!paths || paths.length === 0 || !originalName) {
      return res.status(400).json({ error: 'storagePath (or storagePaths) and originalName are required' });
    }

    const docId = uuidv4();
    const ext = fileType || path.extname(originalName).toLowerCase();
    const primaryPath = paths[0];

    await vectorStore.addDocument(docId, {
      originalName,
      filename: primaryPath,
      filePath: primaryPath,
      storagePath: primaryPath,
      fileType: ext,
      fileSize: fileSize || 0,
      status: 'processing',
      uploadDate: new Date().toISOString(),
    });

    res.status(202).json({
      id: docId,
      originalName,
      status: 'processing',
      message: 'Document registered. Processing started.',
    });

    processDocumentFromStorage(docId, paths, ext).catch(async (err) => {
      console.error(`Error processing document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadDocument, signUpload, registerDocument, listDocuments, getDocument, deleteDocument, reprocessDocument, getDocumentResources };
