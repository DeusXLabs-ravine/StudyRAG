/**
 * Widget content controller — returns today's flashcard (all users) and
 * today's definition (Pro only). The mobile clients sync this payload into
 * native shared storage so iOS WidgetKit + Android Glance can render without
 * another network call.
 *
 * Shape is deliberately small (payload is persisted into UserDefaults /
 * DataStore, which have size ceilings). The mobile widget extension reads
 * only this payload — it never talks to Supabase directly.
 */

const supabase = require('../config/database');
const { getSubscriptionSnapshotForUser } = require('../services/subscriptionService');

const PRO_TIERS = new Set(['pro', 'pro_annual', 'unlimited', 'enterprise']);

function pickDailyIndex(arr, seed) {
  // Deterministic per-user per-day pick so the widget doesn't flicker between
  // foregrounds in the same day.
  if (!arr?.length) return -1;
  const today = new Date();
  const day = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  let hash = 0;
  const combined = `${seed}:${day}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
  }
  return hash % arr.length;
}

async function resolveTier(user) {
  // Prefer the full subscription snapshot (mirrors how the rest of the app
  // resolves Pro gating). Fall back to whatever is on req.user if the snapshot
  // fails — widgets should never 500 on a tier lookup hiccup.
  try {
    const snapshot = await getSubscriptionSnapshotForUser(user.id, user.email);
    if (snapshot?.tier) return String(snapshot.tier).toLowerCase();
  } catch {
    /* fall through */
  }
  return String(user?.subscription_tier || 'free').toLowerCase();
}

async function getDailyWidgetContent(req, res, next) {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ error: { message: 'Not authenticated.' } });

    const userId = user.id;
    const tier = await resolveTier(user);
    const isPro = PRO_TIERS.has(tier);

    // Flashcard: prefer a card that is due today (SRS next_review_date <= now).
    // Fall back to any card the user owns. Cards live in flashcard_cards and
    // ownership is on the parent deck, so we fetch the user's deck ids first
    // and then query cards by deck_id — two small queries beat a shaky join.
    let flashcard = null;
    if (supabase) {
      try {
        const { data: decks } = await supabase
          .from('flashcard_decks')
          .select('id')
          .eq('user_id', userId)
          .limit(200);

        const deckIds = (decks || []).map(d => d.id);
        if (deckIds.length) {
          const nowIso = new Date().toISOString();

          // First try due cards — these are what SRS really wants surfaced.
          const { data: dueCards } = await supabase
            .from('flashcard_cards')
            .select('front, back')
            .in('deck_id', deckIds)
            .lte('next_review_date', nowIso)
            .limit(50);

          let pool = dueCards || [];
          if (!pool.length) {
            // Fallback: any card the user owns (new deck scenario — every card
            // starts with next_review_date = null so the lte filter misses them).
            const { data: anyCards } = await supabase
              .from('flashcard_cards')
              .select('front, back')
              .in('deck_id', deckIds)
              .limit(50);
            pool = anyCards || [];
          }

          const idx = pickDailyIndex(pool, userId);
          if (idx >= 0) flashcard = { front: pool[idx].front, back: pool[idx].back };
        }
      } catch {
        /* swallow — fall through to stub */
      }
    }
    if (!flashcard) {
      flashcard = {
        front: 'Welcome to StudyRAG',
        back: 'Add a document to get your first flashcards — this widget will update daily.',
      };
    }

    // Definition: Pro only. Draws from notes/docs the user flagged primary.
    let definition = null;
    if (isPro && supabase) {
      try {
        const { data } = await supabase
          .from('documents')
          .select('title, summary')
          .eq('user_id', userId)
          .eq('primary_source', true)
          .limit(20);
        const idx = pickDailyIndex(data, `${userId}:def`);
        if (idx >= 0 && data[idx].summary) {
          definition = {
            term: data[idx].title || 'Today\'s concept',
            meaning: String(data[idx].summary).slice(0, 220),
          };
        }
      } catch {
        /* swallow */
      }
      if (!definition) {
        definition = {
          term: 'Spaced repetition',
          meaning: 'Reviewing material at expanding intervals — just before you\'d forget it — locks it in long-term memory.',
        };
      }
    }

    res.set('Cache-Control', 'private, max-age=21600'); // 6h
    return res.json({
      tier: isPro ? 'pro' : 'free',
      flashcard,
      definition, // null for non-Pro
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDailyWidgetContent };
