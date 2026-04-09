const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const { cacheResponse } = require('../middleware/responseCache');
const {
  uploadDocument,
  signUpload,
  registerDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  reprocessDocument,
  getDocumentResources,
  registerUrl,
  registerNote,
  togglePrimarySource,
  registerTopic,
} = require('../controllers/documentController');

// Direct-to-Supabase-Storage upload flow (preferred)
router.post('/sign-upload', signUpload);
router.post('/register', registerDocument);

// Multi-source document registration
router.post('/register-url', registerUrl);
router.post('/register-note', registerNote);
router.post('/register-topic', registerTopic);
router.patch('/:id/primary', togglePrimarySource);

// Legacy upload flow (fallback)
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', cacheResponse(30_000), listDocuments);          // 30 s cache
router.get('/:id', cacheResponse(60_000), getDocument);         // 1 min cache
router.delete('/:id', deleteDocument);
router.get('/:id/resources', cacheResponse(5 * 60_000), getDocumentResources);  // 5 min cache
router.post('/:id/reprocess', reprocessDocument);

module.exports = router;
