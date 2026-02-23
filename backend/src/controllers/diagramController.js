const {
  getDiagramsByDocument,
  getDiagramById,
  getDiagramImageUrl,
  regenerateDiagramLevel,
} = require('../services/diagramService');

async function listDiagrams(req, res, next) {
  try {
    const { documentId } = req.params;
    const diagrams = await getDiagramsByDocument(documentId);
    res.json({ diagrams });
  } catch (error) {
    next(error);
  }
}

async function getDiagram(req, res, next) {
  try {
    const diagram = await getDiagramById(req.params.id);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }
    res.json(diagram);
  } catch (error) {
    next(error);
  }
}

async function getImageUrl(req, res, next) {
  try {
    const url = await getDiagramImageUrl(req.params.id);
    if (!url) {
      return res.status(404).json({ error: 'Diagram or image not found' });
    }
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

async function regenerateLevel(req, res, next) {
  try {
    const { level } = req.body;
    if (!level) {
      return res.status(400).json({ error: 'level is required in request body' });
    }
    const result = await regenerateDiagramLevel(req.params.id, level);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listDiagrams, getDiagram, getImageUrl, regenerateLevel };
