const supabase = require('../config/database');
const { keyPool, withModelFallback } = require('../config/gemini');
const { GAME_GENERATION_PROMPT } = require('../utils/prompts');

const GAME_TYPES = ['quiz', 'matching', 'fill_blank', 'speed_round'];
const DEFAULT_COUNTS = { quiz: 5, matching: 6, fill_blank: 4, speed_round: 8 };

async function getModuleContent(moduleId) {
  const { data, error } = await supabase
    .from('modules')
    .select('title, topic, content, objectives, takeaways')
    .eq('id', moduleId)
    .single();

  if (error || !data) throw new Error('Module not found');
  return data;
}

function buildPrompt(content, topic, gameType, difficulty, count) {
  return GAME_GENERATION_PROMPT
    .replace('{game_type}', gameType)
    .replace('{topic}', topic)
    .replace('{difficulty}', difficulty)
    .replace(/\{count\}/g, String(count))
    .replace('{content}', content);
}

function parseGameJSON(text) {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

async function generateGame(moduleId, gameType, difficulty = 'medium') {
  const module = await getModuleContent(moduleId);

  // Pick random game type if not specified
  if (!gameType || !GAME_TYPES.includes(gameType)) {
    gameType = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
  }

  const count = DEFAULT_COUNTS[gameType] || 5;
  const contentText = [
    `Title: ${module.title}`,
    `Topic: ${module.topic}`,
    `Objectives: ${JSON.stringify(module.objectives)}`,
    `Content: ${module.content}`,
    `Key Takeaways: ${JSON.stringify(module.takeaways)}`,
  ].join('\n\n');

  const prompt = buildPrompt(contentText, module.topic || module.title, gameType, difficulty, count);

  const result = await withModelFallback(
    (modelName) => async () => {
      if (!keyPool) throw new Error('Gemini API key not configured');
      const entry = keyPool.getClient();
      const model = entry.genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(prompt);
      return response.response.text();
    },
    'fast',
    0
  );

  const gameData = parseGameJSON(result);

  // Validate structure
  if (!gameData.type || !GAME_TYPES.includes(gameData.type)) {
    throw new Error('Invalid game data returned from AI');
  }

  return gameData;
}

async function generateQuizGame(moduleId, difficulty = 'medium', count = 5) {
  return generateGame(moduleId, 'quiz', difficulty);
}

async function generateMatchingGame(moduleId, count = 6) {
  return generateGame(moduleId, 'matching', 'medium');
}

async function generateFillBlankGame(moduleId, count = 4) {
  return generateGame(moduleId, 'fill_blank', 'medium');
}

async function generateSpeedRound(moduleId, count = 8) {
  return generateGame(moduleId, 'speed_round', 'medium');
}

module.exports = {
  generateGame,
  generateQuizGame,
  generateMatchingGame,
  generateFillBlankGame,
  generateSpeedRound,
  GAME_TYPES,
};
