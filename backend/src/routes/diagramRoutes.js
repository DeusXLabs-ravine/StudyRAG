const express = require('express');
const router = express.Router();
const {
  listDiagrams,
  getDiagram,
  getImageUrl,
  regenerateLevel,
  generateForTopic,
  getModuleDiagrams,
  getGeneratedDiagramImage,
} = require('../controllers/diagramController');
const { cacheResponse } = require('../middleware/responseCache');

// On-demand generation
router.post('/generate', generateForTopic);

// Generated diagrams by module (cached 2 min)
router.get('/module/:moduleId', cacheResponse(2 * 60_000), getModuleDiagrams);

// Generated diagram image (signed URL)
router.get('/generated/:id/image', getGeneratedDiagramImage);

// Existing document-extracted diagram routes
router.get('/document/:documentId', listDiagrams);
router.get('/:id', getDiagram);
router.get('/:id/image', getImageUrl);
router.post('/:id/regenerate', regenerateLevel);

module.exports = router;
