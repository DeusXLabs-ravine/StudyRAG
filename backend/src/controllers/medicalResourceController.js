const {
  enrichModuleWithMedicalResources,
  getMedicalResourcesByModule,
  getMedicalResourcesByDocument,
  searchPubMed,
  lookupICD10,
} = require('../services/medicalResourceService');

async function getModuleMedicalResources(req, res, next) {
  try {
    const { moduleId } = req.params;
    const resources = await getMedicalResourcesByModule(moduleId);
    res.json({ resources });
  } catch (error) {
    next(error);
  }
}

async function getDocumentMedicalResources(req, res, next) {
  try {
    const { documentId } = req.params;
    const resources = await getMedicalResourcesByDocument(documentId);
    res.json({ resources });
  } catch (error) {
    next(error);
  }
}

async function enrichModule(req, res, next) {
  try {
    const { moduleId, documentId, topic, content } = req.body;
    if (!moduleId || !topic) {
      return res.status(400).json({ error: 'moduleId and topic are required' });
    }

    const userId = req.userId || null;

    // Get module content if not provided
    let moduleContent = content;
    if (!moduleContent && moduleId) {
      const supabase = require('../config/database');
      const { data } = await supabase.from('modules').select('content').eq('id', moduleId).single();
      if (data) moduleContent = data.content;
    }

    const resources = await enrichModuleWithMedicalResources({
      moduleId,
      documentId,
      topic,
      content: moduleContent,
      userId,
    });

    res.json({ resources, count: resources.length });
  } catch (error) {
    next(error);
  }
}

async function pubmedSearch(req, res, next) {
  try {
    const { query, maxResults } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }
    const articles = await searchPubMed(query, parseInt(maxResults) || 5);
    res.json({ articles });
  } catch (error) {
    next(error);
  }
}

async function icd10Lookup(req, res, next) {
  try {
    const { term, maxResults } = req.query;
    if (!term) {
      return res.status(400).json({ error: 'term parameter is required' });
    }
    const codes = await lookupICD10(term, parseInt(maxResults) || 5);
    res.json({ codes });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getModuleMedicalResources,
  getDocumentMedicalResources,
  enrichModule,
  pubmedSearch,
  icd10Lookup,
};
