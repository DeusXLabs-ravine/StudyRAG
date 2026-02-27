const { generateSimulationParams, SIMULATION_CATALOG } = require('../services/simulationGeneratorService');

async function generateParams(req, res, next) {
  try {
    const { query, moduleId, documentId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await generateSimulationParams(query, moduleId || null, documentId || null);
    res.json(result);
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      return res.status(503).json({ error: 'The AI service is experiencing high demand right now. Please try again in a moment!' });
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few seconds and try again.' });
    }
    next(err);
  }
}

async function getCatalog(req, res) {
  res.json({ simulations: SIMULATION_CATALOG });
}

module.exports = { generateParams, getCatalog };
