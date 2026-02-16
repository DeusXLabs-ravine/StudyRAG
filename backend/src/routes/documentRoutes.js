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
} = require('../controllers/documentController');

// Direct-to-Supabase-Storage upload flow (preferred)
router.post('/sign-upload', signUpload);
router.post('/register', registerDocument);

// Legacy upload flow (fallback)
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);
router.get('/:id/resources', getDocumentResources);
router.post('/:id/reprocess', reprocessDocument);

module.exports = router;
