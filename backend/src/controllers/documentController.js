const { v4: uuidv4 } = require('uuid');
const { extractTextFromBuffer, extractTextFromNote } = require('../services/fileProcessor');
const { extractContentFromUrl } = require('../services/webScrapingService');
const { buildPageIndex, invalidateDocCache } = require('../services/pageIndexService');
const vectorStore = require('../services/vectorStore');
const { generateInitialModules, generateRemainingModules, deleteModulesByDocument, enrichModulesWithResources } = require('../services/moduleGenerator');
const { researchDocument, getResourcesByDocument, deleteResourcesByDocument } = require('../services/webResearchService');
const { processDocumentDiagrams, deleteDiagramsByDocument } = require('../services/diagramService');
// Lazy-loaded to avoid circular dependencies (syllabusDetection imports registerUrlInternal from this file)
let _topicResearchService, _syllabusDetectionService, _qaContentService, _programmingDocsService;
function getTopicResearchService() { return _topicResearchService || (_topicResearchService = require('../services/topicResearchService')); }
function getSyllabusDetectionService() { return _syllabusDetectionService || (_syllabusDetectionService = require('../services/syllabusDetectionService')); }
function getQAContentService() { return _qaContentService || (_qaContentService = require('../services/qaContentService')); }
function getProgrammingDocsService() { return _programmingDocsService || (_programmingDocsService = require('../services/programmingDocsService')); }
const courseService = require('../services/courseService');
const supabase = require('../config/database');
const { allowedFileTypes } = require('../config/env');
const path = require('path');

const { responseCache } = require('../config/cache');
const { storeDocumentHash, findDocumentByHash, cloneDocumentArtefacts } = require('../services/sharedResearchCache');
const STORAGE_BUCKET = 'documents';

/**
 * Invalidate any cached document list responses for a user.
 * Called after mutations (upload, delete, register) so the next
 * GET /api/documents returns fresh data.
 */
function invalidateDocListCache(userId) {
  if (!userId) return;
  responseCache.invalidatePrefix(`res:${userId}:/api/documents`);
}

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
  // Strip null bytes that PostgreSQL rejects — some PDFs embed \u0000 in text
  const stripNulls = (s) => {
    if (!s || typeof s !== 'string') return s;
    return s.replace(/\u0000/g, '').replace(/\\u0000/g, '');
  };
  text = stripNulls(text);
  if (rawPages) {
    rawPages = rawPages.map(p => ({ ...p, text: stripNulls(p.text), heading: stripNulls(p.heading) }));
  }
  let currentMetadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  if (metadata && typeof metadata === 'object') {
    currentMetadata = JSON.parse(stripNulls(JSON.stringify(currentMetadata)));
  }

  const pipelineStart = Date.now();
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;

  // Helper to update processing step in the database for real-time frontend feedback
  const updateStep = async (step) => {
    currentMetadata.processingStep = step;
    try {
      await vectorStore.updateDocumentStatus(docId, { extractedMetadata: currentMetadata });
    } catch (err) {
      console.warn(`${prefix} Failed to update processing step to ${step}: ${err.message}`);
    }
  };

  await updateStep('indexing');

  const log = (step, startTime) =>
    console.log(`${prefix} ${step}: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // ── Shared document cache: skip full pipeline if another user already processed this exact doc ──
  try {
    const hash = await storeDocumentHash(docId, text);
    const existing = await findDocumentByHash(hash, docId);
    if (existing) {
      console.log(`${prefix} Content hash match → cloning artefacts from ${existing.id.slice(0, 8)}`);
      const cloned = await cloneDocumentArtefacts(existing.id, docId, userId);
      if (cloned) {
        await vectorStore.updateDocumentStatus(docId, {
          status: 'ready',
          processedDate: new Date().toISOString(),
          extractedMetadata: metadata,
        });
        console.log(`${prefix} Clone complete (${cloned.moduleCount} modules, ${cloned.questionCount} questions) — skipping full pipeline`);
        invalidateDocListCache(userId);
        return;
      }
    }
  } catch (err) {
    console.warn(`${prefix} Document hash check failed (continuing with full pipeline): ${err.message}`);
  }

  // Phase 1: Critical path — page index + initial modules run in parallel,
  // but document becomes "ready" as soon as the page index succeeds.
  // The page index is all the chat system needs; modules are only for Learn.
  const pageIndexPromise = (async () => {
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

    // Background: generate section podcasts for anyone with podcast access,
    // including admin-unlimited users whose billing tier may still be lower.
    setImmediate(async () => {
      try {
        if (!userId) {
          console.log(`${prefix} Skipping section podcasts — no user context available`);
          return;
        }
        const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');
        const subscription = await getSubscriptionSnapshotForUser(userId);
        if (!subscription.featureAccess.canPodcast) {
          console.log(`${prefix} Skipping section podcasts — user does not have podcast access`);
          return;
        }
        const { generateSectionPodcasts } = require('../services/sectionPodcastService');
        const { getUserTeachingLevel } = require('../services/userProfileService');
        const tl = await getUserTeachingLevel(userId);
        await generateSectionPodcasts(docId, tree, pages, userId, tl);
      } catch (err) {
        console.error(`${prefix} Section podcast generation failed: ${err.message}`);
      }
    });

    return pages.length;
  })();

  await updateStep('generating_modules');

  const modulesPromise = (async () => {
    const t = Date.now();
    const result = await generateInitialModules(docId, text, userId);
    log(`Initial modules (${result.moduleCount} modules, segment 1/${result.totalSegments})`, t);

    // After initial modules, update status to reflect partial modules available
    currentMetadata.modulesStatus = result.totalSegments > 1 ? 'partial' : 'complete';
    await vectorStore.updateDocumentStatus(docId, { extractedMetadata: currentMetadata });

    return result;
  })();

  // Phase 1b: Mark document ready as soon as page index succeeds.
  // The user can now start chatting immediately while modules generate.
  const pageCount = await pageIndexPromise;

  currentMetadata.modulesStatus = 'generating';
  currentMetadata.processingStep = 'ready';
  await vectorStore.updateDocumentStatus(docId, {
    status: 'ready',
    processedDate: new Date().toISOString(),
    chunkCount: pageCount,
    extractedMetadata: currentMetadata,
  });

  log('READY (chat available, modules generating)', pipelineStart);
  invalidateDocListCache(userId);

  // Phase 2: Background — remaining modules + web research + enrichment.
  // Chains off modulesPromise so remaining modules start after initial ones finish.
  modulesPromise.then(async (initialResult) => {
    try {
      await updateStep('generating_remaining');
      const t = Date.now();
      await generateRemainingModules(docId, text, userId);
      log('Remaining modules (background)', t);

      // Final metadata update: all modules generated
      currentMetadata.modulesStatus = 'complete';
      await vectorStore.updateDocumentStatus(docId, { extractedMetadata: currentMetadata });
    } catch (err) {
      console.error(`${prefix} Background module generation failed: ${err.message}`);
    }
  }).catch(err => {
    // Surface content-extraction errors if initial modules failed
    const isContentError = err.message?.includes('Unable to generate study modules');
    if (isContentError) {
      console.warn(`${prefix} Module generation skipped: ${err.message}`);
      currentMetadata.modulesStatus = 'failed';
      vectorStore.updateDocumentStatus(docId, { error: err.message, extractedMetadata: currentMetadata }).catch(() => {});
    } else {
      console.error(`${prefix} Initial module generation failed (non-fatal): ${err.message}`);
    }
  });

  (async () => {
    try {
      await updateStep('researching');
      const t = Date.now();
      const researchResult = await researchDocument(docId, text);
      log('Web research (background)', t);

      if (researchResult) {
        await updateStep('enriching');
        const t2 = Date.now();
        await enrichModulesWithResources(docId);
        log('Enrichment (background)', t2);
      }
      await updateStep('complete');
    } catch (err) {
      console.error(`${prefix} Background enrichment failed: ${err.message}`);
    }
    log('TOTAL PIPELINE (with enrichment)', pipelineStart);
  })();

  // Phase 3: Content intelligence detection (background, non-blocking)
  (async () => {
    try {
      const { detectDocumentType } = getSyllabusDetectionService();
      const docType = await detectDocumentType(text);
      const currentMeta = metadata || {};

      // Store document subtype
      await supabase.from('documents')
        .update({ document_subtype: docType.type })
        .eq('id', docId);

      await vectorStore.updateDocumentStatus(docId, {
        extractedMetadata: { ...currentMeta, documentSubtype: docType.type },
      });

      console.log(`${prefix} Content intelligence: type=${docType.type}, confidence=${docType.confidence}`);

      // Syllabus detection → auto-create course
      if (docType.type === 'syllabus' && docType.confidence > 0.7) {
        console.log(`${prefix} Syllabus detected — extracting course data...`);
        const { extractSyllabusData, createCourseFromSyllabus } = getSyllabusDetectionService();
        const syllabusData = await extractSyllabusData(text);
        await createCourseFromSyllabus(docId, syllabusData, userId);
      }

      // Q&A content → generate tutorial modules with answers
      if (['problem_set', 'exam'].includes(docType.type) && docType.confidence > 0.7) {
        console.log(`${prefix} Q&A content detected — generating tutorial modules...`);
        const { processQAContent } = getQAContentService();
        await processQAContent(docId, text, userId);
      }

      // Programming documentation detection
      const { detectProgrammingContext } = getProgrammingDocsService();
      const progContext = detectProgrammingContext(text);
      if (progContext.isProgramming) {
        console.log(`${prefix} Programming content detected: ${progContext.language} (${progContext.frameworks.join(', ')})`);
        await vectorStore.updateDocumentStatus(docId, {
          extractedMetadata: { ...currentMeta, documentSubtype: docType.type, programmingContext: progContext },
        });
      }
    } catch (err) {
      console.error(`${prefix} Content intelligence failed: ${err.message}`);
    }
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

    invalidateDocListCache(req.user?.id);
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

    // URL and note documents can be reprocessed from their stored source
    const sourceType = doc.sourceType || 'file';

    if (sourceType === 'file' && !doc.storagePath) {
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

    const userId = req.user?.id || null;

    if (sourceType === 'url' && doc.sourceUrl) {
      // Re-fetch from the original URL
      processUrlDocument(id, doc.sourceUrl, userId).catch(async (err) => {
        console.error(`Error reprocessing URL document ${id}:`, err);
        await vectorStore.updateDocumentStatus(id, { status: 'failed', error: err.message });
      });
    } else if (sourceType === 'note') {
      // Re-process from stored source_content
      // Fetch source_content directly since formatDoc omits it
      const { data: raw } = await supabase.from('documents').select('source_content').eq('id', id).single();
      const content = raw?.source_content || '';
      if (!content) {
        await vectorStore.updateDocumentStatus(id, { status: 'failed', error: 'No stored note content found' });
        return;
      }
      processNoteDocument(id, content, doc.originalName, userId).catch(async (err) => {
        console.error(`Error reprocessing note document ${id}:`, err);
        await vectorStore.updateDocumentStatus(id, { status: 'failed', error: err.message });
      });
    } else {
      // Download from Supabase Storage and reprocess (pass old pages for incremental diffing)
      processDocumentFromStorage(id, doc.storagePath, doc.fileType, oldPages, userId).catch(async (err) => {
        console.error(`Error reprocessing document ${id}:`, err);
        await vectorStore.updateDocumentStatus(id, { status: 'failed', error: err.message });
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Return a short-lived signed URL the frontend can use to render the raw
 * file (currently used by Buddy's "study a PDF together" panel). Only file-
 * backed documents have a storagePath — URL/note/topic docs return 400.
 */
async function getDocumentViewUrl(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await vectorStore.getDocument(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.storagePath) {
      return res.status(400).json({ error: 'This document has no rendered file (e.g. URL, note, or topic source).' });
    }
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.storagePath, 60 * 30); // 30 min
    if (error) throw error;
    res.json({
      signedUrl: data.signedUrl,
      fileType: doc.fileType || null,
      totalPages: doc.metadata?.pages || doc.pages || null,
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

    invalidateDocListCache(req.user?.id);
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

/**
 * Register a URL as a document source. Fetches, extracts, and processes.
 */
async function registerUrl(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
    }

    const userId = req.user?.id || null;

    // Check for duplicate URL per user
    const dupQuery = supabase
      .from('documents')
      .select('id')
      .eq('source_url', url);
    if (userId) dupQuery.eq('user_id', userId);
    const { data: existing } = await dupQuery.limit(1);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'This URL has already been added', existingId: existing[0].id });
    }

    const docId = uuidv4();
    const displayName = parsedUrl.hostname + parsedUrl.pathname.slice(0, 60);

    await vectorStore.addDocument(docId, {
      originalName: displayName,
      filename: `url_${docId}`,
      filePath: url,
      fileType: 'url',
      fileSize: 0,
      status: 'processing',
      uploadDate: new Date().toISOString(),
      userId,
      sourceType: 'url',
      sourceUrl: url,
    });

    res.status(202).json({
      id: docId,
      originalName: displayName,
      sourceType: 'url',
      sourceUrl: url,
      status: 'processing',
      message: 'URL registered. Fetching and processing started.',
    });

    // Background processing
    processUrlDocument(docId, url, userId).catch(async (err) => {
      console.error(`Error processing URL document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

async function processUrlDocument(docId, url, userId = null) {
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;
  const t = Date.now();

  const { text, pages: rawPages, metadata } = await extractContentFromUrl(url);
  console.log(`${prefix} URL extraction: ${((Date.now() - t) / 1000).toFixed(1)}s (${text.length} chars)`);

  // Update the document name with the extracted title if available
  if (metadata.title) {
    await vectorStore.addDocument(docId, {
      originalName: metadata.title,
      filename: `url_${docId}`,
      filePath: url,
      fileType: 'url',
      fileSize: text.length,
      status: 'processing',
      userId,
      sourceType: 'url',
      sourceUrl: url,
      extractedMetadata: metadata,
    });
  }

  await runProcessingPipeline(docId, text, metadata, rawPages, null, null, userId);
}

/**
 * Register typed notes as a document source.
 */
async function registerNote(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (content.length > 512000) { // ~500KB
      return res.status(400).json({ error: 'Note content exceeds maximum size (500KB)' });
    }

    const userId = req.user?.id || null;
    const docId = uuidv4();
    const noteTitle = title?.trim() || 'Untitled Note';

    await vectorStore.addDocument(docId, {
      originalName: noteTitle,
      filename: `note_${docId}`,
      filePath: `note_${docId}`,
      fileType: 'note',
      fileSize: content.length,
      status: 'processing',
      uploadDate: new Date().toISOString(),
      userId,
      sourceType: 'note',
      sourceContent: content,
    });

    res.status(202).json({
      id: docId,
      originalName: noteTitle,
      sourceType: 'note',
      status: 'processing',
      message: 'Note saved. Processing started.',
    });

    // Background processing
    processNoteDocument(docId, content, noteTitle, userId).catch(async (err) => {
      console.error(`Error processing note document ${docId}:`, err);
      await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
    });
  } catch (error) {
    next(error);
  }
}

async function processNoteDocument(docId, content, title, userId = null) {
  const prefix = `[Pipeline ${docId.slice(0, 8)}]`;
  const t = Date.now();

  const { text, pages: rawPages, metadata } = extractTextFromNote(content, title);
  console.log(`${prefix} Note processing: ${((Date.now() - t) / 1000).toFixed(1)}s (${text.length} chars)`);

  await runProcessingPipeline(docId, text, metadata, rawPages, null, null, userId);
}

/**
 * Toggle the is_primary_source flag on a document.
 */
async function togglePrimarySource(req, res, next) {
  try {
    const { id } = req.params;
    const { isPrimary } = req.body;

    const doc = await vectorStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await vectorStore.updateDocumentStatus(id, { isPrimarySource: !!isPrimary });

    res.json({
      id,
      isPrimarySource: !!isPrimary,
      message: isPrimary ? 'Document marked as primary source' : 'Primary source flag removed',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /register-topic — Study a topic without uploading a document.
 * AI researches the topic and generates a full curriculum.
 */
async function registerTopic(req, res, next) {
  try {
    const { topic, description } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'topic is required' });
    }
    if (topic.trim().length > 200) {
      return res.status(400).json({ error: 'topic must be 200 characters or fewer' });
    }

    const userId = req.user?.id || null;
    const docId = uuidv4();
    const topicTitle = topic.trim();

    // Create document record for the topic
    await vectorStore.addDocument(docId, {
      originalName: topicTitle,
      filename: `topic_${docId}`,
      filePath: `topic_${docId}`,
      fileType: 'topic',
      fileSize: 0,
      status: 'processing',
      uploadDate: new Date().toISOString(),
      userId,
      sourceType: 'topic',
      sourceContent: description || null,
    });

    res.status(202).json({
      id: docId,
      originalName: topicTitle,
      sourceType: 'topic',
      status: 'processing',
      message: 'Topic registered. AI is researching and generating your curriculum.',
    });

    // Background: research topic → generate modules
    (async () => {
      try {
        const { researchTopic } = getTopicResearchService();
        const { text, sources, metadata } = await researchTopic(topicTitle, userId);

        // Store the researched text as source_content (strip null bytes for Postgres)
        const cleanText = text.replace(/\u0000/g, '');
        await supabase.from('documents').update({
          source_content: cleanText,
          file_size: cleanText.length,
        }).eq('id', docId);

        // Store verified grounding sources as document resources
        if (sources && sources.length > 0) {
          const { v4: makeId } = require('uuid');
          const resourceRows = sources
            .filter(s => s.url)
            .map(s => ({
              id: makeId(),
              document_id: docId,
              title: s.title || topicTitle,
              url: s.url,
              snippet: null,
              topic: topicTitle,
              resource_type: 'article',
            }));
          if (resourceRows.length > 0) {
            await supabase.from('document_resources').insert(resourceRows);
            console.log(`[TopicResearch] Stored ${resourceRows.length} verified sources for "${topicTitle}"`);
          }
        }

        const rawPages = null;
        await runProcessingPipeline(docId, text, metadata, rawPages, null, null, userId);

        // Auto-create a course for the topic
        const courseId = await courseService.createCourse(topicTitle, description || `AI-researched curriculum for: ${topicTitle}`, 'topic', userId);
        await courseService.addDocumentToCourse(courseId, docId, 'source', 0);

        // Link generated modules to the course so they show up on the Learn page
        await supabase.from('modules')
          .update({ course_id: courseId })
          .eq('document_id', docId)
          .is('course_id', null);

        await courseService.updateCourseStatus(courseId, { status: 'ready' });
        console.log(`[TopicResearch] Course "${topicTitle}" ready with modules linked to course ${courseId.slice(0, 8)}`);
      } catch (err) {
        console.error(`[TopicResearch] Failed for "${topicTitle}" (doc ${docId}):`, err.message);
        const msg = err.message || '';
        const friendlyError = (msg.includes('429') || msg.includes('quota') || msg.includes('rate'))
          ? "High demand right now — please try again in a minute."
          : (msg.includes('timeout') || msg.includes('timed out'))
          ? "Research took too long — please try again."
          : "Something went wrong generating this course. Please try again.";
        await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: friendlyError });
      }
    })();
  } catch (error) {
    next(error);
  }
}

/**
 * Internal helper to register a URL document programmatically (no req/res).
 * Used by syllabusDetectionService to auto-import free textbooks.
 * Returns the new document ID or null on failure.
 */
async function registerUrlInternal(url, userId = null) {
  const docId = uuidv4();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const displayName = parsedUrl.hostname + parsedUrl.pathname.slice(0, 60);

  await vectorStore.addDocument(docId, {
    originalName: displayName,
    filename: `url_${docId}`,
    filePath: url,
    fileType: 'url',
    fileSize: 0,
    status: 'processing',
    uploadDate: new Date().toISOString(),
    userId,
    sourceType: 'url',
    sourceUrl: url,
  });

  // Background processing
  processUrlDocument(docId, url, userId).catch(async (err) => {
    console.error(`Error processing internal URL document ${docId}:`, err);
    await vectorStore.updateDocumentStatus(docId, { status: 'failed', error: err.message });
  });

  return docId;
}

module.exports = {
  uploadDocument, signUpload, registerDocument, listDocuments, getDocument,
  deleteDocument, reprocessDocument, getDocumentResources, getDocumentViewUrl,
  registerUrl, registerNote, togglePrimarySource, registerTopic, registerUrlInternal,
};
