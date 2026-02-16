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
      const doc = await vectorStore.getDocument(docId);
      if (doc) {
        await vectorStore.addDocument(docId, { ...doc, id: undefined, status: 'failed', error: err.message });
      }
    });
  } catch (error) {
    next(error);
  }
}

async function processDocumentFromBuffer(docId, buffer, ext) {
  const { text, metadata } = await extractTextFromBuffer(buffer, ext);
  await runProcessingPipeline(docId, text, metadata);
}

/**
 * Download a file from Supabase Storage with retry, then process it.
 */
async function processDocumentFromStorage(docId, storagePath, ext) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);
      if (error) throw new Error(`Storage download error: ${error.message}`);

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text, metadata } = await extractTextFromBuffer(buffer, ext);
      return await runProcessingPipeline(docId, text, metadata);
    } catch (err) {
      lastErr = err;
      console.warn(`Storage download attempt ${attempt + 1}/3 failed for ${storagePath}: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function runProcessingPipeline(docId, text, metadata) {
  // Chunk text
  const chunks = chunkText(text);

  // Generate embeddings
  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddings(texts);

  // Store in vector store
  const chunksWithEmbeddings = chunks.map((chunk, i) => ({
    id: uuidv4(),
    text: chunk.text,
    heading: chunk.heading,
    embedding: embeddings[i],
  }));

  await vectorStore.addChunks(docId, chunksWithEmbeddings);

  // Generate learning modules
  await generateModules(docId, text);

  // Web research enrichment: find related books, articles, and textbooks
  try {
    await researchDocument(docId, text);
    await enrichModulesWithResources(docId);
  } catch (researchErr) {
    console.error(`Web research/enrichment failed for document ${docId}:`, researchErr.message);
    // Non-blocking — research is supplementary, document processing continues
  }

  // Update document status
  const doc = await vectorStore.getDocument(docId);
  await vectorStore.addDocument(docId, {
    ...doc,
    id: undefined,
    status: 'ready',
    processedDate: new Date().toISOString(),
    chunkCount: chunks.length,
    extractedMetadata: metadata,
  });
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
      await vectorStore.addDocument(id, { ...doc, id: undefined, status: 'failed', error: err.message });
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

    const ext = path.extname(filename).toLowerCase().slice(1);
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
    const { storagePath, originalName, fileSize, fileType } = req.body;

    if (!storagePath || !originalName) {
      return res.status(400).json({ error: 'storagePath and originalName are required' });
    }

    const docId = uuidv4();
    const ext = fileType || path.extname(originalName).toLowerCase();

    await vectorStore.addDocument(docId, {
      originalName,
      filename: storagePath,
      filePath: storagePath,
      storagePath,
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

    processDocumentFromStorage(docId, storagePath, ext).catch(async (err) => {
      console.error(`Error processing document ${docId}:`, err);
      const doc = await vectorStore.getDocument(docId);
      if (doc) {
        await vectorStore.addDocument(docId, { ...doc, id: undefined, status: 'failed', error: err.message });
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadDocument, signUpload, registerDocument, listDocuments, getDocument, deleteDocument, reprocessDocument, getDocumentResources };
