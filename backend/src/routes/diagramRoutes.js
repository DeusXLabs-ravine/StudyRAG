const express = require('express');
const router = express.Router();
const { listDiagrams, getDiagram, getImageUrl, regenerateLevel } = require('../controllers/diagramController');

router.get('/document/:documentId', listDiagrams);
router.get('/:id', getDiagram);
router.get('/:id/image', getImageUrl);
router.post('/:id/regenerate', regenerateLevel);

module.exports = router;
