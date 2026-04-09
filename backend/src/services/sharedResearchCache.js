/**
 * Shared Research Cache
 * ─────────────────────
 * Saves expensive Gemini research results (topic curricula + document processing)
 * so that any user researching the same topic — or uploading the same document —
 * benefits from prior work without re-running the AI pipeline.
 *
 * TWO CACHES:
 *
 *  1. Topic Research Cache  (table: shared_topic_research)
 *     ─────────────────────────────────────────────────────
 *     Keyed by normalised topic string.
 *     Similarity check: exact-normalised match first; if miss, cosine similarity
 *     on topic embedding (threshold ≥ 0.95 ≈ same concept, different wording).
 *
 *  2. Document Content Cache  (documents.content_hash column)
 *     ──────────────────────────────────────────────────────
 *     Keyed by SHA-256 of the extracted text (cryptographic identity guarantee).
 *     If another user's already-processed document has the same hash, we clone
 *     its modules, questions, and resources rather than re-running the pipeline.
 *     The new user's document record remains private; only processed artefacts
 *     (modules, questions, resources) are shared.
 *
 * Privacy notes:
 *  • Topic research content is academic/public-domain knowledge — safe to share.
 *  • Document artefacts (modules, questions, web resources) are derived works of
 *    public-domain text; they contain no PII and are safe to share across users.
 *  • Raw document text and chunks remain private per user (not cloned).
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { generateEmbedding, TaskType } = require('./embeddingService');
const { embeddingCache } = require('../config/cache');

// ─── Similarity threshold ─────────────────────────────────────
// 0.95 = very high — only fires when topics are essentially identical phrasing.
// Raise to 0.97 for stricter matching; lower to 0.90 for more liberal sharing.
const EMBEDDING_SIMILARITY_THRESHOLD = 0.95;

// ─── Topic normalisation ──────────────────────────────────────
function normaliseTopic(topic) {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')  // strip punctuation
    .trim();
}

// ─── Embedding helper (cached) ────────────────────────────────
async function getTopicEmbedding(topic) {
  const cacheKey = `emb:topic:${normaliseTopic(topic)}`;
  let embedding = embeddingCache.get(cacheKey);
  if (!embedding) {
    embedding = await generateEmbedding(topic, TaskType.RETRIEVAL_QUERY);
    embeddingCache.set(cacheKey, embedding);
  }
  return embedding;
}

// ─── Cosine similarity (pure JS) ─────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────────────────────────
// TOPIC RESEARCH CACHE
// ─────────────────────────────────────────────────────────────

/**
 * Look up a cached topic research result.
 *
 * Strategy:
 *  1. Exact normalised-string match (fast, no embedding needed).
 *  2. Embedding cosine similarity ≥ threshold (catches "Cardiac Physiology"
 *     vs "cardiology physiology" vs "physiology of the heart").
 *
 * Returns { text, sources, metadata, cacheId } or null.
 */
async function lookupTopicResearch(topic) {
  const normalised = normaliseTopic(topic);

  // Step 1: exact match
  const { data: exact } = await supabase
    .from('shared_topic_research')
    .select('id, topic_normalised, topic_original, text, sources, method, domain')
    .eq('topic_normalised', normalised)
    .limit(1)
    .maybeSingle();

  if (exact) {
    await supabase
      .from('shared_topic_research')
      .update({ hit_count: supabase.rpc('increment', { x: 1 }), last_hit_at: new Date().toISOString() })
      .eq('id', exact.id)
      .then(() => {});  // fire-and-forget

    console.log(`[SharedCache] Topic exact hit: "${topic}" → "${exact.topic_original}"`);
    return {
      text: exact.text,
      sources: exact.sources || [],
      metadata: { topic, method: exact.method, domain: exact.domain, fromSharedCache: true, cacheId: exact.id },
    };
  }

  // Step 2: embedding similarity — fetch all topics with embeddings
  // (table is small — a few hundred rows at most — so a full scan is fine)
  const { data: candidates } = await supabase
    .from('shared_topic_research')
    .select('id, topic_normalised, topic_original, text, sources, method, domain, topic_embedding')
    .not('topic_embedding', 'is', null)
    .limit(500);

  if (!candidates || candidates.length === 0) return null;

  let queryEmbedding;
  try {
    queryEmbedding = await getTopicEmbedding(topic);
  } catch (err) {
    console.warn(`[SharedCache] Embedding failed, skipping similarity check: ${err.message}`);
    return null;
  }

  let bestScore = 0;
  let bestCandidate = null;
  for (const row of candidates) {
    if (!row.topic_embedding) continue;
    const rowVec = Array.isArray(row.topic_embedding) ? row.topic_embedding : JSON.parse(row.topic_embedding);
    const score = cosineSimilarity(queryEmbedding, rowVec);
    if (score > bestScore) { bestScore = score; bestCandidate = row; }
  }

  if (bestScore >= EMBEDDING_SIMILARITY_THRESHOLD && bestCandidate) {
    await supabase
      .from('shared_topic_research')
      .update({ hit_count: supabase.rpc('increment', { x: 1 }), last_hit_at: new Date().toISOString() })
      .eq('id', bestCandidate.id)
      .then(() => {});

    console.log(`[SharedCache] Topic similarity hit (${(bestScore * 100).toFixed(1)}%): "${topic}" → "${bestCandidate.topic_original}"`);
    return {
      text: bestCandidate.text,
      sources: bestCandidate.sources || [],
      metadata: {
        topic,
        method: bestCandidate.method,
        domain: bestCandidate.domain,
        fromSharedCache: true,
        similarityScore: bestScore,
        originalTopic: bestCandidate.topic_original,
        cacheId: bestCandidate.id,
      },
    };
  }

  return null;
}

/**
 * Store a completed topic research result in the shared cache.
 * Generates and stores an embedding for future similarity lookups.
 * No-ops silently on failure (caching is best-effort).
 */
async function storeTopicResearch(topic, result) {
  try {
    const normalised = normaliseTopic(topic);
    const id = uuidv4();

    // Generate embedding for similarity matching
    let embedding = null;
    try {
      embedding = await getTopicEmbedding(topic);
    } catch { /* embedding optional — exact match still works */ }

    const row = {
      id,
      topic_normalised: normalised,
      topic_original: topic,
      text: result.text,
      sources: result.sources || [],
      method: result.metadata?.method || null,
      domain: result.metadata?.domain || null,
      hit_count: 0,
      topic_embedding: embedding ? JSON.stringify(embedding) : null,
    };

    const { error } = await supabase
      .from('shared_topic_research')
      .upsert(row, { onConflict: 'topic_normalised', ignoreDuplicates: false });

    if (error) {
      console.warn(`[SharedCache] Failed to store topic research: ${error.message}`);
    } else {
      console.log(`[SharedCache] Stored topic research: "${topic}" (${result.text.length} chars)`);
    }
  } catch (err) {
    console.warn(`[SharedCache] storeTopicResearch error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT CONTENT CACHE
// ─────────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 fingerprint of document text content.
 * Normalises whitespace before hashing so minor formatting differences
 * between the same document don't produce different hashes.
 */
function computeContentHash(text) {
  const normalised = text.replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalised, 'utf8').digest('hex');
}

/**
 * Store the content hash on a document row.
 * Called immediately after text extraction, before pipeline processing.
 */
async function storeDocumentHash(docId, text) {
  const hash = computeContentHash(text);
  const { error } = await supabase
    .from('documents')
    .update({ content_hash: hash })
    .eq('id', docId);
  if (error) console.warn(`[SharedCache] storeDocumentHash failed: ${error.message}`);
  return hash;
}

/**
 * Find a previously processed document with the same content hash.
 * Returns the source document record, or null if none found.
 *
 * Excludes:
 *  - the document being registered (docId)
 *  - documents still processing or errored
 */
async function findDocumentByHash(hash, excludeDocId) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, original_name, user_id, status')
    .eq('content_hash', hash)
    .eq('status', 'ready')
    .neq('id', excludeDocId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[SharedCache] findDocumentByHash error: ${error.message}`);
    return null;
  }
  return data || null;
}

/**
 * Clone modules, questions, and resources from sourceDocId to targetDocId.
 *
 * What IS cloned (derived, non-personal artefacts):
 *  - modules (with new IDs, new document_id)
 *  - questions (with new IDs, new module_id mapping)
 *  - document_resources (web research links)
 *  - medical_resources (ICD-10, PubMed, etc.)
 *
 * What is NOT cloned:
 *  - chunks/embeddings (the raw text index — private to each user's document)
 *  - pages / page_index (same reason)
 *  - module_progress, quiz_sessions (user-specific analytics)
 *  - flashcard_decks / cards (personal review state)
 *
 * Returns { moduleCount, questionCount, resourceCount } or null on failure.
 */
async function cloneDocumentArtefacts(sourceDocId, targetDocId, targetUserId) {
  const prefix = `[SharedCache clone ${sourceDocId.slice(0, 8)} → ${targetDocId.slice(0, 8)}]`;

  try {
    // ── 1. Fetch source modules ─────────────────────────────
    const { data: srcModules, error: modErr } = await supabase
      .from('modules')
      .select('*')
      .eq('document_id', sourceDocId)
      .order('order_index');

    if (modErr) throw new Error(`Fetch modules: ${modErr.message}`);
    if (!srcModules || srcModules.length === 0) {
      console.log(`${prefix} Source has no modules yet — aborting clone`);
      return null;
    }

    // ── 2. Fetch source questions ───────────────────────────
    const srcModuleIds = srcModules.map(m => m.id);
    const { data: srcQuestions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .in('module_id', srcModuleIds);

    if (qErr) throw new Error(`Fetch questions: ${qErr.message}`);

    // ── 3. Build new module rows with remapped IDs ──────────
    const moduleIdMap = new Map(); // old_id → new_id
    const newModules = srcModules.map(m => {
      const newId = uuidv4();
      moduleIdMap.set(m.id, newId);
      return {
        id: newId,
        document_id: targetDocId,
        order_index: m.order_index,
        title: m.title,
        topic: m.topic,
        objectives: m.objectives,
        content: m.content,
        takeaways: m.takeaways,
        module_type: m.module_type || null,
        parent_module_id: m.parent_module_id ? moduleIdMap.get(m.parent_module_id) || null : null,
        questions_json: m.questions_json || null,
        user_id: targetUserId || null,
      };
    });

    // ── 4. Insert modules ───────────────────────────────────
    const { error: insModErr } = await supabase.from('modules').insert(newModules);
    if (insModErr) throw new Error(`Insert modules: ${insModErr.message}`);

    // ── 5. Build new question rows ──────────────────────────
    let newQuestions = [];
    if (srcQuestions && srcQuestions.length > 0) {
      newQuestions = srcQuestions.map(q => ({
        id: uuidv4(),
        module_id: moduleIdMap.get(q.module_id) || null,
        type: q.type,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        topic: q.topic,
      })).filter(q => q.module_id); // drop orphans (shouldn't happen)

      if (newQuestions.length > 0) {
        const { error: insQErr } = await supabase.from('questions').insert(newQuestions);
        if (insQErr) throw new Error(`Insert questions: ${insQErr.message}`);
      }
    }

    // ── 6. Clone document_resources ────────────────────────
    const { data: srcResources } = await supabase
      .from('document_resources')
      .select('*')
      .eq('document_id', sourceDocId);

    let resourceCount = 0;
    if (srcResources && srcResources.length > 0) {
      const newResources = srcResources.map(r => ({
        id: uuidv4(),
        document_id: targetDocId,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        topic: r.topic,
        resource_type: r.resource_type,
      }));
      const { error: insRErr } = await supabase.from('document_resources').insert(newResources);
      if (insRErr) console.warn(`${prefix} document_resources insert failed: ${insRErr.message}`);
      else resourceCount = newResources.length;
    }

    // ── 7. Clone medical_resources ──────────────────────────
    const { data: srcMedical } = await supabase
      .from('medical_resources')
      .select('*')
      .eq('document_id', sourceDocId);

    if (srcMedical && srcMedical.length > 0) {
      const newMedical = srcMedical.map(r => ({
        id: uuidv4(),
        document_id: targetDocId,
        module_id: moduleIdMap.get(r.module_id) || null,
        topic: r.topic,
        source_type: r.source_type,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        extra_data: r.extra_data,
        user_id: targetUserId || null,
      }));
      await supabase.from('medical_resources').insert(newMedical).then(({ error }) => {
        if (error) console.warn(`${prefix} medical_resources insert failed: ${error.message}`);
      });
    }

    console.log(`${prefix} Clone complete — ${newModules.length} modules, ${newQuestions.length} questions, ${resourceCount} resources`);
    return {
      moduleCount: newModules.length,
      questionCount: newQuestions.length,
      resourceCount,
    };
  } catch (err) {
    console.error(`${prefix} Clone failed: ${err.message}`);
    return null;
  }
}

module.exports = {
  normaliseTopic,
  computeContentHash,
  lookupTopicResearch,
  storeTopicResearch,
  storeDocumentHash,
  findDocumentByHash,
  cloneDocumentArtefacts,
};
