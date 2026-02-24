const {
  getDiagramsByDocument,
  getDiagramById,
  getDiagramImageUrl,
  regenerateDiagramLevel,
} = require('../services/diagramService');
const {
  generateDiagramForTopic,
  getDiagramsForModule,
  getGeneratedDiagramImageUrl,
} = require('../services/diagramGenerationService');
const { getUserTeachingLevel, getUserInterests } = require('../services/userProfileService');

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

// ─── New: On-Demand Generation Endpoints ──────────────────────

async function generateForTopic(req, res, next) {
  try {
    const { topic, moduleId, documentId, diagramType, teachingLevel } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    const userId = req.userId || null;
    const [level, interests] = await Promise.all([
      teachingLevel ? Promise.resolve(teachingLevel) : getUserTeachingLevel(userId),
      getUserInterests(userId),
    ]);

    // Get module content for context if moduleId provided
    let moduleContent = '';
    if (moduleId) {
      const supabase = require('../config/database');
      const { data } = await supabase.from('modules').select('content').eq('id', moduleId).single();
      if (data) moduleContent = data.content;
    }

    const diagram = await generateDiagramForTopic({
      topic,
      moduleContent,
      moduleId,
      documentId,
      diagramType: diagramType || 'auto',
      teachingLevel: level,
      interests,
      userId,
    });

    res.json(diagram);
  } catch (error) {
    next(error);
  }
}

async function getModuleDiagrams(req, res, next) {
  try {
    const { moduleId } = req.params;
    const diagrams = await getDiagramsForModule(moduleId);
    res.json({ diagrams });
  } catch (error) {
    next(error);
  }
}

async function getGeneratedDiagramImage(req, res, next) {
  try {
    const url = await getGeneratedDiagramImageUrl(req.params.id);
    if (!url) {
      return res.status(404).json({ error: 'Generated diagram or image not found' });
    }
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDiagrams,
  getDiagram,
  getImageUrl,
  regenerateLevel,
  generateForTopic,
  getModuleDiagrams,
  getGeneratedDiagramImage,
};
