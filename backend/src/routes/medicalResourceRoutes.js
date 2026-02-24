const express = require('express');
const router = express.Router();
const {
  getModuleMedicalResources,
  getDocumentMedicalResources,
  enrichModule,
  pubmedSearch,
  icd10Lookup,
} = require('../controllers/medicalResourceController');
const { cacheResponse } = require('../middleware/responseCache');

// Enrich a module with medical resources (on-demand)
router.post('/enrich', enrichModule);

// Get medical resources for a specific module (cached 5 min)
router.get('/module/:moduleId', cacheResponse(5 * 60_000), getModuleMedicalResources);

// Get medical resources for a document
router.get('/document/:documentId', getDocumentMedicalResources);

// Direct PubMed search
router.get('/pubmed', pubmedSearch);

// Direct ICD-10 lookup
router.get('/icd10', icd10Lookup);

module.exports = router;
