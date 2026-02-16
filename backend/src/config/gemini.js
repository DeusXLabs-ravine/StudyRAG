const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiApiKey } = require('./env');

if (!geminiApiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not set. AI features will not work.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Model tiers for different complexity levels
const MODELS = {
  fast: 'gemini-3-flash-preview',          // Simple tasks, flashcards, quick generation
  standard: 'gemini-3-flash-preview',      // Default for most tasks
  advanced: 'gemini-3-pro-preview', // Complex reasoning, math, science, aptitude tests
};

function getGenerativeModel(tier = 'standard') {
  if (!genAI) throw new Error('Gemini API key not configured');
  const modelName = MODELS[tier] || MODELS.standard;
  return genAI.getGenerativeModel({ model: modelName });
}

function getSearchGroundedModel(tier = 'standard') {
  if (!genAI) throw new Error('Gemini API key not configured');
  const modelName = MODELS[tier] || MODELS.standard;
  return genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }],
  });
}

function getEmbeddingModel() {
  if (!genAI) throw new Error('Gemini API key not configured');
  return genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
}

// Determine which model tier to use based on content complexity
function selectModelTier(contentHints = {}) {
  const { hasMath, hasScience, hasCode, isComplex, isAptitudeTest } = contentHints;
  if (isAptitudeTest || hasMath || hasCode || isComplex) return 'advanced';
  if (hasScience) return 'advanced';
  return 'standard';
}

module.exports = { genAI, getGenerativeModel, getSearchGroundedModel, getEmbeddingModel, selectModelTier, MODELS };
