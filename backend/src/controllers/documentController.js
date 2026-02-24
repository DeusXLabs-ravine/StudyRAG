const { v4: uuidv4 } = require('uuid');
const { extractTextFromBuffer } = require('../services/fileProcessor');
const { buildPageIndex, invalidateDocCache } = require('../services/pageIndexService');
const vectorStore = require('../services/vectorStore');
const { generateInitialModules, generateRemainingModules, deleteModulesByDocument, enrichModulesWithResources } = require('../services/moduleGenerator');
const { researchDocument, getResourcesByDocument, deleteResourcesByDocument } = require('../services/webResearchService');
const { processDocumentDiagrams, deleteDiagramsByDocument } = require('../services/diagramService');
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
      userId: req.user?.id || null,
    });

    res.status(202).json({
      id: docId,
      originalName: file.originalname,
      status: 'processing',
      message: 'Document uploaded. Processing started.',
    });

    processDocumentFromBuffer(docId, file.buffer, ext, req.user?.id || null).catch(async (err) => {
      console.error(`Error processing document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

async function processDocumentFromBuffer(docId, buffer, ext, userId = null) {
  const t = Date.now();
  const { text, pages: rawPages, metadata } = await extractTextFromBuffer(buffer, ext);
  console.log(`[Pipeline ${docId.slice(0, 8)}] Text extraction: ${((Date.now() - t) / 1000).toFixed(1)}s (${text.length} chars, ${rawPages ? rawPages.length + ' pages' : 'no native pages'})`);
  await runProcessingPipeline(docId, text, metadata, rawPages, buffer, ext, userId);
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
async function processDocumentFromStorage(docId, storagePaths, ext, oldPages = null, userId = null) {
  const paths = Array.isArray(storagePaths) ? storagePaths : [storagePaths];
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;

  // Download all chunks in parallel
  const t0 = Date.now();
  const buffers = await Promise.all(paths.map(p => downloadChunk(p)));
  const buffer = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
  console.log(`${prefix} Storage download: ${((Date.now() - t0) / 1000).toFixed(1)}s (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${paths.length} chunk(s))`);

  // Extract text
  const t1 = Date.now();
  const { text, pages: rawPages, metadata } = await extractTextFromBuffer(buffer, ext);
  console.log(`${prefix} Text extraction: ${((Date.now() - t1) / 1000).toFixed(1)}s (${text.length} chars, ${rawPages ? rawPages.length + ' pages' : 'no native pages'})`);

  // Incremental reprocessing (#7): log diff stats if old pages available
  if (oldPages && oldPages.length > 0) {
    const newPageTexts = rawPages ? rawPages.map(p => p.text.slice(0, 200)) : [];
    const oldPageTexts = oldPages.map(p => p.text.slice(0, 200));
    const changedCount = newPageTexts.filter((t, i) => t !== oldPageTexts[i]).length;
    const addedCount = Math.max(0, newPageTexts.length - oldPageTexts.length);
    const removedCount = Math.max(0, oldPageTexts.length - newPageTexts.length);
    console.log(`${prefix} Incremental diff: ${changedCount} changed, ${addedCount} added, ${removedCount} removed pages`);
  }

  return await runProcessingPipeline(docId, text, metadata, rawPages, buffer, ext, userId);
}

async function runProcessingPipeline(docId, text, metadata, rawPages = null, buffer = null, ext = null, userId = null) {
  const pipelineStart = Date.now();
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;
  const log = (step, startTime) =>
    console.log(`${prefix} ${step}: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Phase 1: Critical path — initial modules + page index run in parallel.
  // Only the first segment of modules is generated here so the user can start learning fast.
  const [pageIndexResult, modulesResult] = await Promise.allSettled([
    // Pipeline A: Build page index → store pages + tree
    (async () => {
      const t = Date.now();
      const { tree, pages } = await buildPageIndex(rawPages, text, metadata);
      console.log(`${prefix} Page index built: ${pages.length} pages`);

      const pagesWithIds = pages.map(p => ({
        id: uuidv4(),
        pageNumber: p.pageNumber,
        text: p.text,
        heading: p.heading || null,
      }));
      await vectorStore.addPages(docId, pagesWithIds);
      await vectorStore.addPageIndex(docId, tree, pages.length);
      log('Page index + store', t);
      return pages.length;
    })(),
    // Pipeline B: Generate initial learning modules (first segment only)
    (async () => {
      const t = Date.now();
      const result = await generateInitialModules(docId, text, userId);
      log(`Initial modules (${result.moduleCount} modules, segment 1/${result.totalSegments})`, t);
      return result;
    })(),
  ]);

  // Module generation is critical — lessons can't be viewed without it
  if (modulesResult.status === 'rejected') {
    throw modulesResult.reason;
  }

  // Page index failure is critical — search won't work
  if (pageIndexResult.status === 'rejected') {
    throw pageIndexResult.reason;
  }

  const pageCount = pageIndexResult.status === 'fulfilled' ? pageIndexResult.value : 0;

  // Mark document as ready immediately — lessons are viewable now
  await vectorStore.updateDocumentStatus(docId, {
    status: 'ready',
    processedDate: new Date().toISOString(),
    chunkCount: pageCount,
    extractedMetadata: metadata,
  });

  log('READY (lessons available)', pipelineStart);

  // Phase 2: Background — remaining modules + web research + enrichment.
  // All fire-and-forget so the user isn't blocked.
  (async () => {
    try {
      const t = Date.now();
      await generateRemainingModules(docId, text, userId);
      log('Remaining modules (background)', t);
    } catch (err) {
      console.error(`${prefix} Background module generation failed: ${err.message}`);
    }
  })();

  (async () => {
    try {
      const t = Date.now();
      const researchResult = await researchDocument(docId, text);
      log('Web research (background)', t);

      if (researchResult) {
        const t2 = Date.now();
        await enrichModulesWithResources(docId);
        log('Enrichment (background)', t2);
      }
    } catch (err) {
      console.error(`${prefix} Background enrichment failed: ${err.message}`);
    }
    log('TOTAL PIPELINE (with enrichment)', pipelineStart);
  })();

  // Diagram detection & analysis (also background, independent from web research)
  if (buffer && ext) {
    (async () => {
      try {
        // Check if diagram detection is enabled in user settings
        const query = supabase
          .from('user_settings')
          .select('value')
          .eq('key', 'diagram_detection_enabled');
        // Note: userId is not available in background pipeline, so we check without filter
        const { data: setting } = await query.single();

        if (!setting || setting.value !== 'true') {
          console.log(`${prefix} Diagram detection disabled — skipping`);
          return;
        }

        const t = Date.now();
        const pageTexts = (rawPages || []).map(p => ({ pageNumber: p.pageNumber, text: p.text }));
        await processDocumentDiagrams(docId, buffer, ext, pageTexts);
        log('Diagram processing (background)', t);
      } catch (err) {
        console.error(`${prefix} Diagram processing failed: ${err.message}`);
      }
    })();
  }
}

async function listDocuments(req, res, next) {
  try {
    const documents = await vectorStore.getAllDocuments(req.user?.id || null);
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

    // Remove from vector store, modules, and diagrams
    await vectorStore.removeDocument(id);
    await deleteModulesByDocument(id);
    await deleteDiagramsByDocument(id).catch(err =>
      console.error(`Failed to delete diagrams for ${id}: ${err.message}`)
    );

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

    if (!doc.storagePath) {
      return res.status(400).json({
        error: 'This document was uploaded before the storage migration. Please delete and re-upload it.',
      });
    }

    // Incremental reprocessing (#7): fetch old pages for diffing
    const oldPages = await vectorStore.getDocumentPages(id);

    // Reset status
    await vectorStore.addDocument(id, { ...doc, id: undefined, status: 'processing' });

    // Remove old data (pages, chunks, modules, resources)
    await vectorStore.deletePages(id);
    invalidateDocCache(id);
    await vectorStore.removeDocument(id);
    await vectorStore.addDocument(id, { ...doc, id: undefined, status: 'processing' });
    await deleteModulesByDocument(id);
    await deleteResourcesByDocument(id);
    await deleteDiagramsByDocument(id).catch(err =>
      console.error(`Failed to delete diagrams for ${id}: ${err.message}`)
    );

    res.json({ message: 'Reprocessing started', status: 'processing' });

    // Download from Supabase Storage and reprocess (pass old pages for incremental diffing)
    processDocumentFromStorage(id, doc.storagePath, doc.fileType, oldPages, req.user?.id || null).catch(async (err) => {
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
      userId: req.user?.id || null,
    });

    res.status(202).json({
      id: docId,
      originalName,
      status: 'processing',
      message: 'Document registered. Processing started.',
    });

    processDocumentFromStorage(docId, paths, ext, null, req.user?.id || null).catch(async (err) => {
      console.error(`Error processing document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadDocument, signUpload, registerDocument, listDocuments, getDocument, deleteDocument, reprocessDocument, getDocumentResources };
