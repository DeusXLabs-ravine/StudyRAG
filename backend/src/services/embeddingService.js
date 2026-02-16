const { TaskType } = require('@google/generative-ai');
const { getEmbeddingModel } = require('../config/gemini');

/**
 * Generate an embedding for a single text.
 * @param {string} text
 * @param {string} taskType - One of TaskType values (e.g. RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY)
 */
async function generateEmbedding(text, taskType = TaskType.RETRIEVAL_DOCUMENT) {
  const model = getEmbeddingModel();
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts (for indexing document chunks).
 * Uses RETRIEVAL_DOCUMENT task type by default.
 */
async function generateEmbeddings(texts, taskType = TaskType.RETRIEVAL_DOCUMENT) {
  const embeddings = [];
  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text, taskType))
    );
    embeddings.push(...batchResults);
  }
  return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings, TaskType };
