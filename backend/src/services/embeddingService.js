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
 * Generate embeddings for multiple texts using Gemini's batch API.
 * Processes up to 100 texts per API call instead of one-by-one.
 */
async function generateEmbeddings(texts, taskType = TaskType.RETRIEVAL_DOCUMENT) {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const embeddings = [];

  // Gemini batchEmbedContents supports up to 100 texts per call
  const BATCH_SIZE = 100;
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const requests = batch.map(text => ({
      content: { parts: [{ text }] },
      taskType,
    }));

    const result = await model.batchEmbedContents({ requests });
    const batchEmbeddings = result.embeddings.map(e => e.values);
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings, TaskType };
