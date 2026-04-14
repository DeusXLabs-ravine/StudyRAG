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
const { enforceUsageCap } = require('../middleware/tierAuth');

// On-demand generation — counts against diagram cap per tier
router.post('/generate', enforceUsageCap('diagrams'), generateForTopic);

// Generated diagrams by module (cached 2 min)
router.get('/module/:moduleId', cacheResponse(2 * 60_000), getModuleDiagrams);

// Generated diagram image (signed URL)
router.get('/generated/:id/image', getGeneratedDiagramImage);

// Existing document-extracted diagram routes
router.get('/document/:documentId', listDiagrams);
router.get('/:id', getDiagram);
router.get('/:id/image', getImageUrl);
router.post('/:id/regenerate', enforceUsageCap('diagrams'), regenerateLevel);

module.exports = router;
