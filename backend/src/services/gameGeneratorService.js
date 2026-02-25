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

  // Truncate content to ~8K chars to stay well under Gemini's token limit
  const moduleContent = (module.content || '').slice(0, 8000);
  const contentText = [
    `Title: ${module.title}`,
    `Topic: ${module.topic}`,
    `Objectives: ${JSON.stringify(module.objectives)}`,
    `Content: ${moduleContent}`,
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

  let gameData = parseGameJSON(result);

  // Normalize the type field (Gemini may return "Quiz" instead of "quiz")
  if (gameData.type) gameData.type = gameData.type.toLowerCase().replace(/[\s-]/g, '_');

  // Force correct type if AI returned something unexpected
  if (!gameData.type || !GAME_TYPES.includes(gameData.type)) {
    // Try to infer from structure
    if (gameData.questions && Array.isArray(gameData.questions)) gameData.type = 'quiz';
    else if (gameData.pairs && Array.isArray(gameData.pairs)) gameData.type = 'matching';
    else if (gameData.items && Array.isArray(gameData.items)) gameData.type = 'fill_blank';
    else if (gameData.statements && Array.isArray(gameData.statements)) gameData.type = 'speed_round';
    else throw new Error('Invalid game data returned from AI');
  }

  // Ensure required fields exist per type
  if (gameData.type === 'quiz') {
    if (!gameData.questions || !Array.isArray(gameData.questions) || gameData.questions.length === 0) {
      throw new Error('Quiz game has no questions');
    }
    // Normalize: ensure correct is a number index
    gameData.questions = gameData.questions.map(q => ({
      question: q.question || q.text || '',
      options: q.options || q.choices || [],
      correct: typeof q.correct === 'number' ? q.correct :
               typeof q.answer === 'number' ? q.answer :
               typeof q.correct === 'string' ? (q.options || []).indexOf(q.correct) : 0,
      explanation: q.explanation || q.hint || '',
    }));
    gameData.xpReward = gameData.xpReward || 10;
  } else if (gameData.type === 'matching') {
    if (!gameData.pairs || !Array.isArray(gameData.pairs) || gameData.pairs.length === 0) {
      throw new Error('Matching game has no pairs');
    }
    gameData.xpReward = gameData.xpReward || 15;
  } else if (gameData.type === 'fill_blank') {
    if (!gameData.items || !Array.isArray(gameData.items) || gameData.items.length === 0) {
      throw new Error('Fill blank game has no items');
    }
    gameData.xpReward = gameData.xpReward || 12;
  } else if (gameData.type === 'speed_round') {
    if (!gameData.statements || !Array.isArray(gameData.statements) || gameData.statements.length === 0) {
      throw new Error('Speed round has no statements');
    }
    gameData.timePerQuestion = gameData.timePerQuestion || 8;
    gameData.xpReward = gameData.xpReward || 20;
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
