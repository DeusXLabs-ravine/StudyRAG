'use strict';

/**
 * buddyMemoryService
 *
 * Long-term relationship memory for Study Buddy.
 *   - distill(transcript) — post-session LLM extraction into discrete facts
 *   - recall({ userId, profileId, query }) — semantic recall via pgvector
 *   - save(userId, profileId, items) — dedupe by similarity, then insert
 *   - decayImportance() — weekly cron hook (not wired yet)
 */

const { SchemaType } = require('@google/generative-ai');
const supabase = require('../config/database');
const { keyPool, resolveModel, withRetryOnRateLimit } = require('../config/gemini');
const { generateEmbedding, generateEmbeddings, TaskType } = require('./embeddingService');

const DEDUPE_SIM_THRESHOLD = 0.92; // near-duplicate ⇒ bump importance instead of insert
const MAX_DISTILL_ITEMS = 10;

const DISTILL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          kind: {
            type: SchemaType.STRING,
            enum: ['fact', 'preference', 'struggle', 'goal', 'win', 'inside_joke'],
          },
          content: { type: SchemaType.STRING },
          importance: { type: SchemaType.INTEGER },
        },
        required: ['kind', 'content', 'importance'],
      },
    },
    summary: {
      type: SchemaType.OBJECT,
      properties: {
        headline: { type: SchemaType.STRING },
        covered_topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        confusions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        wins: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        next_up: { type: SchemaType.STRING },
      },
      required: ['headline', 'covered_topics'],
    },
  },
  required: ['items', 'summary'],
};

const DISTILL_PROMPT = `You are a memory-distillation assistant for a friendly AI study buddy.

Given a transcript of a study-buddy session (peer-to-peer conversation, not a lecture),
extract the most memory-worthy items about THE USER (not the buddy). Output 0-${MAX_DISTILL_ITEMS}
items total across these kinds:

- fact:        Durable truths about the user (major, field, year, stated name/nickname, etc.)
- preference:  How they like to learn, types of analogies that click, tone they prefer
- struggle:    Topics they keep getting wrong or flagging as hard
- goal:        What they're trying to achieve (exam, project, deadline)
- win:         A moment of "it clicked" this session — only if clearly expressed
- inside_joke: A shared callback/joke the buddy should remember — ONLY if mutually and clearly established (not a one-off pun)

Rules:
- Items must be specific, not generic. "Likes biology" is bad. "Studying USMLE step 1, especially metabolism, deadline in 6 weeks" is good.
- Importance is 1-5, where 5 is "you'd be a bad friend to forget this" and 1 is "nice-to-know trivia".
- Do NOT repeat the same content across kinds.
- Prefer fewer high-quality items over many weak ones.
- If the session had no memorable content (e.g. ambient/mostly silent), return items: [].

Also produce a session summary:
- headline: one sentence, e.g. "Walked through glycolysis start-to-finish, stuck on ATP accounting."
- covered_topics: short strings
- confusions: things the user was unsure about
- wins: things the user clearly understood or improved on
- next_up: one-sentence suggestion for the next session

Transcript follows:
---
{TRANSCRIPT}
---

Return valid JSON only.`;

// ── Distill ──────────────────────────────────────────────────────────────────

async function distill({ transcript, userName = 'the user' }) {
  if (!transcript || !transcript.trim()) {
    return { items: [], summary: null };
  }

  const { genAI } = keyPool.getClient();
  const modelName = resolveModel('fast');
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: DISTILL_SCHEMA,
      temperature: 0.2,
    },
  });

  const prompt = DISTILL_PROMPT
    .replace('{TRANSCRIPT}', transcript.slice(0, 40_000))
    .replace('the user', userName);

  const result = await withRetryOnRateLimit(() => model.generateContent(prompt), 2, 0);
  let parsed;
  try {
    parsed = JSON.parse(result.response.text());
  } catch (err) {
    console.warn('[buddyMemory.distill] Failed to parse response:', err.message);
    return { items: [], summary: null };
  }
  return {
    items: Array.isArray(parsed.items) ? parsed.items.slice(0, MAX_DISTILL_ITEMS) : [],
    summary: parsed.summary || null,
  };
}

// ── Save (dedupe + embed + insert) ───────────────────────────────────────────

async function save({ userId, profileId, items, sessionId }) {
  if (!items?.length) return { inserted: 0, bumped: 0 };

  // Pull existing memory for quick dedupe (limit to recent/important).
  const { data: existing } = await supabase
    .from('buddy_memory')
    .select('id, content, kind, importance, embedding')
    .eq('user_id', userId)
    .eq('buddy_profile_id', profileId)
    .order('importance', { ascending: false })
    .limit(200);

  const existingRows = existing || [];

  // Batch-embed new items
  const texts = items.map(i => i.content);
  const embeddings = await generateEmbeddings(texts, TaskType.RETRIEVAL_DOCUMENT);

  let inserted = 0;
  let bumped = 0;
  const toInsert = [];
  const toBump = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const emb = embeddings[i];
    if (!emb) continue;

    // Find near-duplicate in existing
    let dupe = null;
    let bestSim = -1;
    for (const row of existingRows) {
      if (row.kind !== item.kind || !row.embedding) continue;
      const rowEmb = typeof row.embedding === 'string' ? parseEmbedding(row.embedding) : row.embedding;
      const sim = cosine(emb, rowEmb);
      if (sim > bestSim) { bestSim = sim; dupe = row; }
    }

    if (dupe && bestSim >= DEDUPE_SIM_THRESHOLD) {
      toBump.push({ id: dupe.id, importance: Math.min(5, (dupe.importance || 1) + 1) });
      bumped++;
    } else {
      toInsert.push({
        user_id: userId,
        buddy_profile_id: profileId,
        kind: item.kind,
        content: item.content,
        importance: clamp(item.importance ?? 2, 1, 5),
        source_session_id: sessionId,
        embedding: emb,
      });
      inserted++;
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from('buddy_memory').insert(toInsert);
    if (error) console.warn('[buddyMemory.save] Insert error:', error.message);
  }

  // Bump importance on near-duplicates
  for (const b of toBump) {
    await supabase
      .from('buddy_memory')
      .update({ importance: b.importance, last_accessed_at: new Date().toISOString() })
      .eq('id', b.id);
  }

  return { inserted, bumped };
}

// ── Recall (semantic + importance + recency) ─────────────────────────────────

async function recall({ userId, profileId, query, limit = 12, threshold = 0.55 }) {
  if (!userId || !profileId) return [];

  let queryEmb;
  try {
    queryEmb = await generateEmbedding(query || 'recent context', TaskType.RETRIEVAL_QUERY);
  } catch (err) {
    console.warn('[buddyMemory.recall] Query embed failed:', err.message);
    return [];
  }

  // Call RPC from the migration
  const { data, error } = await supabase.rpc('match_buddy_memory', {
    p_user_id: userId,
    p_profile_id: profileId,
    p_query_embedding: queryEmb,
    p_limit: limit,
    p_similarity_threshold: threshold,
  });

  if (error) {
    console.warn('[buddyMemory.recall] RPC error:', error.message);
    return [];
  }

  // Touch last_accessed_at on returned rows (fire & forget, no await chain)
  if (data?.length) {
    const ids = data.map(r => r.id);
    supabase
      .from('buddy_memory')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', ids)
      .then(() => {}, () => {});
  }

  return data || [];
}

// ── Utilities ────────────────────────────────────────────────────────────────

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

// Supabase returns pgvector columns as strings like "[0.1,0.2,...]"
function parseEmbedding(str) {
  if (!str) return null;
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return null; }
}

module.exports = { distill, save, recall };
