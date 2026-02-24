const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
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
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);
router.get('/:id/resources', getDocumentResources);
router.post('/:id/reprocess', reprocessDocument);

module.exports = router;
