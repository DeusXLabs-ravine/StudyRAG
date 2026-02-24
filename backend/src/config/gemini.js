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

/**
 * Send an image + text prompt to Gemini Vision (multimodal).
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType - e.g. 'image/png', 'image/jpeg'
 * @param {string} prompt - Text prompt
 * @param {string} tier - Model tier ('fast'|'standard'|'advanced')
 * @returns {Promise<string>} Model response text
 */
async function generateContentWithVision(imageBuffer, mimeType, prompt, tier = 'standard') {
  const model = getGenerativeModel(tier);
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
  ]);
  return result.response.text();
}

module.exports = { genAI, getGenerativeModel, getSearchGroundedModel, getEmbeddingModel, selectModelTier, generateContentWithVision, MODELS };
