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
 * Extract grounding metadata (real URLs) from a Gemini response.
 * Returns { groundingUrls, groundingSupports } where:
 * - groundingUrls: array of { title, url } from Google Search grounding chunks
 * - groundingSupports: array of { text, sourceIndices } linking response text to sources
 */
function extractGroundingData(result) {
  const metadata = result.response.candidates?.[0]?.groundingMetadata || {};

  const groundingChunks = metadata.groundingChunks || [];
  const groundingUrls = groundingChunks
    .filter(chunk => chunk.web?.uri)
    .map(chunk => ({ title: chunk.web.title || '', url: chunk.web.uri }));

  const groundingSupports = (metadata.groundingSupports || []).map(s => ({
    text: s.segment?.text || '',
    sourceIndices: s.groundingChunkIndices || [],
  }));

  return { groundingUrls, groundingSupports };
}

/**
 * Use Gemini with Google Search grounding to find resources for a single topic.
 * ONLY returns resources that have real URLs from grounding metadata — never hallucinated titles.
 */
async function researchTopic(topic, searchQuery) {
  const prompt = WEB_RESEARCH_PROMPT
    .replace('{topic}', topic)
    .replace('{search_query}', searchQuery);

  const model = getSearchGroundedModel('standard');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Extract real URLs from Google Search grounding metadata
  const { groundingUrls } = extractGroundingData(result);

  // Try to parse the LLM's structured JSON for snippets/descriptions
  let llmResources = [];
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    llmResources = parsed.resources || [];
  } catch {
    // JSON parse failed — we'll rely solely on grounding URLs
  }

  // ACCURACY-FIRST: Build resources exclusively from grounding URLs.
  // Match LLM descriptions to grounding URLs where possible for richer metadata.
  const resources = groundingUrls.map(gUrl => {
    // Try to find a matching LLM resource by title similarity
    const match = llmResources.find(r =>
      r.title && gUrl.title &&
      (r.title.toLowerCase().includes(gUrl.title.toLowerCase().slice(0, 20)) ||
       gUrl.title.toLowerCase().includes(r.title.toLowerCase().slice(0, 20)))
    );

    return {
      title: match?.title || gUrl.title || topic,
      url: gUrl.url,
      snippet: match?.snippet || null,
      topic,
      resource_type: match?.resource_type || classifyUrl(gUrl.url),
    };
  });

  // Filter out duplicates and empty URLs
  const seen = new Set();
  return resources.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Classify a resource URL by domain pattern.
 */
function classifyUrl(url) {
  if (!url) return 'article';
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'video';
  if (u.includes('coursera.org') || u.includes('edx.org') || u.includes('khanacademy.org')) return 'tutorial';
  if (u.includes('ncbi.nlm.nih.gov') || u.includes('pubmed') || u.includes('scholar.google')) return 'article';
  if (u.includes('springer.com') || u.includes('wiley.com') || u.includes('elsevier.com')) return 'textbook';
  if (u.includes('.edu')) return 'guide';
  return 'article';
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
    if (!r.url) return false; // Drop resources without verified URLs
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Store in database
  const rows = unique.map(r => ({
    id: uuidv4(),
    document_id: docId,
    title: r.title,
    url: r.url,
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

module.exports = { researchDocument, getResourcesByDocument, deleteResourcesByDocument, extractGroundingData };
