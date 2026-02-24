const { getSearchGroundedModel } = require('../config/gemini');
const { TOPIC_CURRICULUM_PROMPT } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');

/**
 * Research a topic using Gemini with search grounding and generate
 * comprehensive curriculum text suitable for module generation.
 */
async function researchTopic(topic, userId = null) {
  const teachingLevel = await getUserTeachingLevel(userId);

  const prompt = TOPIC_CURRICULUM_PROMPT
    .replace('{topic}', topic)
    .replace('{teaching_level}', teachingLevel);

  const model = getSearchGroundedModel('standard');
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text || text.length < 200) {
    throw new Error('Topic research returned insufficient content');
  }

  return {
    text,
    metadata: {
      topic,
      teachingLevel,
      format: 'topic',
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = { researchTopic };
