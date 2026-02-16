const supabase = require('../config/database');
const { getGenerativeModel, getSearchGroundedModel } = require('../config/gemini');
const { WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT, WEB_RESEARCH_PROMPT } = require('../utils/prompts');
const { v4: uuidv4 } = require('uuid');

/**
 * Extract 3-5 key topics from a document for web research.
 */
async function extractTopics(documentText) {
  // Use first ~5000 chars to stay within token limits for topic extraction
  const excerpt = documentText.slice(0, 5000);

  const prompt = WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT
    .replace('{document_text}', excerpt);

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);
  return parsed.topics || [];
}

/**
 * Use Gemini with Google Search grounding to find resources for a single topic.
 */
async function researchTopic(topic, searchQuery) {
  const prompt = WEB_RESEARCH_PROMPT
    .replace('{topic}', topic)
    .replace('{search_query}', searchQuery);

  const model = getSearchGroundedModel('standard');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Extract grounding metadata (URLs from Google Search)
  const groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingUrls = groundingChunks
    .filter(chunk => chunk.web?.uri)
    .map(chunk => ({ title: chunk.web.title || '', url: chunk.web.uri }));

  // Parse the structured resource list from the model response
  let resources = [];
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    resources = (parsed.resources || []).map((r, i) => ({
      title: r.title,
      url: groundingUrls[i]?.url || null,
      snippet: r.snippet,
      topic,
      resource_type: r.resource_type || 'article',
    }));
  } catch {
    // If JSON parsing fails, fall back to grounding URLs only
    resources = groundingUrls.map(g => ({
      title: g.title || topic,
      url: g.url,
      snippet: null,
      topic,
      resource_type: 'article',
    }));
  }

  return resources;
}

/**
 * Research a document: extract topics, search for resources, store in DB.
 * This is the main orchestrator called from the document processing pipeline.
 */
async function researchDocument(docId, documentText) {
  const topics = await extractTopics(documentText);
  if (topics.length === 0) return [];

  // Research all topics in parallel (typically 3-5 topics)
  const results = await Promise.allSettled(
    topics.map(topicObj => researchTopic(topicObj.topic, topicObj.search_query))
  );

  const allResources = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allResources.push(...result.value);
    } else {
      console.error(`Web research failed for topic "${topics[i].topic}":`, result.reason?.message);
    }
  });

  if (allResources.length === 0) return [];

  // Deduplicate by URL
  const seen = new Set();
  const unique = allResources.filter(r => {
    if (!r.url) return true; // keep resources without URLs (book titles)
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Store in database
  const rows = unique.map(r => ({
    id: uuidv4(),
    document_id: docId,
    title: r.title,
    url: r.url || null,
    snippet: r.snippet || null,
    topic: r.topic,
    resource_type: r.resource_type || 'article',
  }));

  const { error } = await supabase.from('document_resources').insert(rows);
  if (error) throw error;

  return unique;
}

/**
 * Get all web resources for a document.
 */
async function getResourcesByDocument(docId) {
  const { data, error } = await supabase
    .from('document_resources')
    .select('*')
    .eq('document_id', docId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    topic: row.topic,
    resourceType: row.resource_type,
    createdAt: row.created_at,
  }));
}

/**
 * Delete all resources for a document (used during reprocessing).
 */
async function deleteResourcesByDocument(docId) {
  const { error } = await supabase
    .from('document_resources')
    .delete()
    .eq('document_id', docId);
  if (error) throw error;
}

module.exports = { researchDocument, getResourcesByDocument, deleteResourcesByDocument };
