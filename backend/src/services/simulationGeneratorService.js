const supabase = require('../config/database');
const { keyPool, withModelFallback } = require('../config/gemini');
const { SIMULATION_GENERATION_PROMPT } = require('../utils/prompts');

const SIMULATION_CATALOG = [
  {
    id: 'projectile_motion',
    title: 'Projectile Motion',
    description: 'Launch a ball and explore range, height, and energy under gravity with optional air resistance.',
    category: 'mechanics',
    difficulty: 'beginner',
    params: ['velocity', 'angle', 'gravity', 'airResistance', 'mass'],
  },
  {
    id: 'pendulum',
    title: 'Simple Pendulum',
    description: 'Observe oscillation, period, and energy exchange of a swinging pendulum with adjustable damping.',
    category: 'mechanics',
    difficulty: 'beginner',
    params: ['length', 'mass', 'gravity', 'damping', 'initialAngle'],
  },
  {
    id: 'spring_mass',
    title: 'Spring-Mass System',
    description: 'Visualize simple harmonic motion with a spring and block, including damping effects.',
    category: 'mechanics',
    difficulty: 'intermediate',
    params: ['springK', 'mass', 'displacement', 'damping'],
  },
  {
    id: 'collision',
    title: '1D Collision',
    description: 'Explore elastic and inelastic collisions between two objects and conservation laws.',
    category: 'mechanics',
    difficulty: 'intermediate',
    params: ['mass1', 'mass2', 'v1', 'v2', 'elasticity'],
  },
];

function parseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

async function getModuleContent(moduleId) {
  if (!moduleId) return null;
  const { data, error } = await supabase
    .from('modules')
    .select('title, topic, content')
    .eq('id', moduleId)
    .single();
  if (error || !data) return null;
  return data;
}

async function generateSimulationParams(query, moduleId, documentId) {
  let contextText = '';

  if (moduleId) {
    const mod = await getModuleContent(moduleId);
    if (mod) {
      contextText = `Module: ${mod.title}\nTopic: ${mod.topic}\nContent excerpt: ${(mod.content || '').slice(0, 3000)}`;
    }
  }

  const catalogStr = SIMULATION_CATALOG.map(s =>
    `- ${s.id}: ${s.title} (${s.category}, params: ${s.params.join(', ')})`
  ).join('\n');

  const prompt = SIMULATION_GENERATION_PROMPT
    .replace('{query}', query)
    .replace('{catalog}', catalogStr)
    .replace('{context}', contextText || 'No specific document context provided.');

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

  const parsed = parseJSON(result);

  // Validate simulationId
  const validIds = SIMULATION_CATALOG.map(s => s.id);
  if (!parsed.simulationId || !validIds.includes(parsed.simulationId)) {
    // Default to projectile_motion
    parsed.simulationId = 'projectile_motion';
  }

  return {
    simulationId: parsed.simulationId,
    title: parsed.title || SIMULATION_CATALOG.find(s => s.id === parsed.simulationId)?.title,
    params: parsed.params || {},
    explanation: parsed.explanation || '',
    suggestedExperiment: parsed.suggestedExperiment || '',
  };
}

module.exports = {
  generateSimulationParams,
  SIMULATION_CATALOG,
};
