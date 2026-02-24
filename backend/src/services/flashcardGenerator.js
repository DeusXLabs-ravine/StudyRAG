const supabase = require('../config/database');
const { getGenerativeModel, selectModelTier } = require('../config/gemini');
const { FLASHCARD_GENERATION_PROMPT, buildInterestsSection, buildLearningStyleSection, buildPaceSection } = require('../utils/prompts');
const vectorStore = require('./vectorStore');
const { getUserTeachingLevel, getUserInterests, getWeakTopics, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');
const { v4: uuidv4 } = require('uuid');

async function generateFlashcards({ numCards = 20, docId = null, name = null, userId = null }) {
  // Try page-based content first, fall back to chunks
  let contextItems = await getContentForGeneration(docId);

  if (contextItems.length === 0) {
    throw new Error('No study materials found. Please upload documents first.');
  }

  // Pages are larger than chunks, so use fewer (8 pages vs 20 chunks)
  const isPages = contextItems[0]?.pageNumber !== undefined;
  const limit = isPages ? 8 : 20;
  const selected = contextItems.slice(0, Math.min(limit, contextItems.length));
  const context = selected.map(c => {
    if (isPages) {
      return `[Page ${c.pageNumber}${c.heading ? ` - ${c.heading}` : ''}]\n${c.text}`;
    }
    return c.text;
  }).join('\n\n---\n\n');
  const sourcePages = isPages ? selected.map(c => c.pageNumber) : [];

  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const prompt = FLASHCARD_GENERATION_PROMPT
    .replace('{num_cards}', numCards)
    .replace('{context}', context)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace));

  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse flashcard generation response');
  }

  const deckId = uuidv4();
  const now = new Date().toISOString();

  const deckRow = {
    id: deckId,
    document_id: docId || null,
    name: name || `Flashcards - ${new Date().toLocaleDateString()}`,
    created_at: now,
  };
  if (userId) deckRow.user_id = userId;

  const cardRows = parsed.flashcards.map(card => ({
    id: uuidv4(),
    deck_id: deckId,
    front: card.front,
    back: card.back,
    topic: card.topic || null,
    source_pages: card.sourcePages || sourcePages.length > 0 ? (card.sourcePages || sourcePages) : null,
    status: 'new',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_date: null,
    last_reviewed: null,
    review_count: 0,
  }));

  await insertDeckWithCards(deckRow, cardRows);

  return formatDeck(deckRow, cardRows);
}

async function generateAdaptiveFlashcards({ numCards = 20, userId = null }) {
  const weakTopics = await getWeakTopics(10, 0.6, userId);
  const allItems = await vectorStore.getAllChunksWithText();

  if (allItems.length === 0) {
    throw new Error('No study materials found. Please upload documents first.');
  }

  const maxItems = 20;
  let selectedItems;
  if (weakTopics.length > 0) {
    const weakSet = new Set(weakTopics.map(t => t.topic.toLowerCase()));
    const weakItems = allItems.filter(item => {
      const heading = (item.heading || '').toLowerCase();
      const text = (item.text || '').toLowerCase().slice(0, 200);
      return [...weakSet].some(topic => heading.includes(topic) || text.includes(topic));
    });
    const shuffledWeak = [...weakItems].sort(() => Math.random() - 0.5);
    const remaining = allItems.filter(c => !weakItems.includes(c)).sort(() => Math.random() - 0.5);
    selectedItems = [...shuffledWeak, ...remaining].slice(0, maxItems);
  } else {
    selectedItems = [...allItems].sort(() => Math.random() - 0.5).slice(0, maxItems);
  }

  const context = selectedItems.map(c => c.text).join('\n\n---\n\n');
  const [teachingLevel, interests, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getUserInterests(userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const prompt = FLASHCARD_GENERATION_PROMPT
    .replace('{num_cards}', numCards)
    .replace('{context}', context)
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', buildInterestsSection(interests))
    .replace('{learning_style_section}', buildLearningStyleSection(learningStyle))
    .replace('{pace_section}', buildPaceSection(learningPace));

  const model = getGenerativeModel('standard');
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse adaptive flashcard generation response');
  }

  const deckId = uuidv4();
  const now = new Date().toISOString();

  const deckRow = {
    id: deckId,
    document_id: null,
    name: `Adaptive Review - ${new Date().toLocaleDateString()}`,
    created_at: now,
  };
  if (userId) deckRow.user_id = userId;

  const cardRows = parsed.flashcards.map(card => ({
    id: uuidv4(),
    deck_id: deckId,
    front: card.front,
    back: card.back,
    topic: card.topic || null,
    status: 'new',
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_date: null,
    last_reviewed: null,
    review_count: 0,
  }));

  await insertDeckWithCards(deckRow, cardRows);

  return formatDeck(deckRow, cardRows);
}

/**
 * Get content for flashcard generation. Tries pages first, falls back to chunks.
 */
async function getContentForGeneration(docId) {
  if (docId) {
    const pages = await vectorStore.getDocumentPages(docId);
    if (pages.length > 0) return pages;
    return await vectorStore.getDocumentChunks(docId);
  }
  return await vectorStore.getAllChunksWithText();
}

async function insertDeckWithCards(deckData, cards) {
  const { error: deckErr } = await supabase.from('flashcard_decks').insert(deckData);
  if (deckErr) throw deckErr;

  if (cards.length > 0) {
    const { error: cardErr } = await supabase.from('flashcard_cards').insert(cards);
    if (cardErr) {
      await supabase.from('flashcard_decks').delete().eq('id', deckData.id);
      throw cardErr;
    }
  }
}

async function getAllFlashcards(userId = null) {
  const query = supabase
    .from('flashcard_decks')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) query.eq('user_id', userId);
  const { data: decks, error } = await query;
  if (error) throw error;

  const result = [];
  for (const deck of (decks || [])) {
    const { data: cards, error: cardErr } = await supabase
      .from('flashcard_cards')
      .select('*')
      .eq('deck_id', deck.id);
    if (cardErr) throw cardErr;
    result.push(formatDeck(deck, cards || []));
  }
  return result;
}

async function getFlashcardDeck(deckId) {
  const { data: deck, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  const { data: cards, error: cardErr } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('deck_id', deckId);
  if (cardErr) throw cardErr;

  return formatDeck(deck, cards || []);
}

async function getStudyQueue(deckId) {
  const { data: deck, error: deckErr } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .single();

  if (deckErr && deckErr.code === 'PGRST116') return null;
  if (deckErr) throw deckErr;

  const { data: cards, error: cardErr } = await supabase.rpc('get_study_queue', {
    p_deck_id: deckId,
  });
  if (cardErr) throw cardErr;

  const { data: dueCount, error: dueErr } = await supabase.rpc('get_due_count', {
    p_deck_id: deckId,
  });
  if (dueErr) throw dueErr;

  return {
    ...formatDeck(deck, cards || []),
    dueCount: dueCount || 0,
  };
}

async function reviewCard(cardId, quality, userId = null) {
  const { data: card, error } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;

  // SM-2 spaced repetition calculation
  const updated = calculateNextReview(card, quality);

  const { error: updateErr } = await supabase
    .from('flashcard_cards')
    .update({
      status: updated.status,
      ease_factor: updated.ease_factor,
      interval_days: updated.interval_days,
      repetitions: updated.repetitions,
      next_review_date: updated.next_review_date,
      last_reviewed: updated.last_reviewed,
      review_count: updated.review_count,
    })
    .eq('id', cardId);
  if (updateErr) throw updateErr;

  // Record topic performance
  if (card.topic) {
    const normalizedScore = Math.max(0, (quality - 1) / 4);
    const tpRow = {
      topic: card.topic,
      source_mode: 'flashcard',
      source_id: card.id,
      score: normalizedScore,
    };
    if (userId) tpRow.user_id = userId;
    const { error: tpErr } = await supabase.from('topic_performance').insert(tpRow);
    if (tpErr) throw tpErr;
  }

  // Record study session
  const sessRow = {
    mode: 'flashcard',
    details_json: {
      cardId: card.id,
      deckId: card.deck_id,
      quality,
    },
  };
  if (userId) sessRow.user_id = userId;
  const { error: sessErr } = await supabase.from('study_sessions').insert(sessRow);
  if (sessErr) throw sessErr;

  // Re-read the updated card
  const { data: updatedCard, error: rereadErr } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (rereadErr) throw rereadErr;

  return formatCard(updatedCard);
}

async function deleteDeck(deckId) {
  const { error } = await supabase
    .from('flashcard_decks')
    .delete()
    .eq('id', deckId);
  if (error) throw error;
}

// --- SM-2 Spaced Repetition Algorithm ---

function calculateNextReview(card, quality) {
  let { ease_factor, interval_days, repetitions } = card;
  const now = new Date().toISOString();

  let newEase = ease_factor;
  let newInterval = interval_days;
  let newReps = repetitions;
  let status;

  if (quality < 2) {
    newReps = 0;
    newInterval = 0;
    status = 'learning';
  } else {
    if (newReps === 0) {
      newInterval = 1;
    } else if (newReps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval_days * ease_factor);
    }
    newReps++;

    const sm2Quality = quality + 1;
    newEase = ease_factor + (0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02));
    newEase = Math.max(1.3, newEase);

    if (quality === 2) {
      newInterval = Math.max(1, Math.round(newInterval * 0.8));
      status = 'learning';
    } else if (newInterval >= 21) {
      status = 'mastered';
    } else {
      status = 'learning';
    }
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    id: card.id,
    status,
    ease_factor: newEase,
    interval_days: newInterval,
    repetitions: newReps,
    next_review_date: nextReviewDate.toISOString(),
    last_reviewed: now,
    review_count: card.review_count + 1,
  };
}

// --- Helpers ---

function formatDeck(deck, cards) {
  return {
    id: deck.id,
    documentId: deck.document_id,
    name: deck.name,
    cards: cards.map(formatCard),
    createdAt: deck.created_at,
  };
}

function formatCard(card) {
  return {
    id: card.id,
    deckId: card.deck_id,
    front: card.front,
    back: card.back,
    topic: card.topic,
    status: card.status,
    easeFactor: card.ease_factor,
    intervalDays: card.interval_days,
    repetitions: card.repetitions,
    nextReviewDate: card.next_review_date,
    lastReviewed: card.last_reviewed,
    reviewCount: card.review_count,
  };
}

module.exports = {
  generateFlashcards,
  generateAdaptiveFlashcards,
  getAllFlashcards,
  getFlashcardDeck,
  getStudyQueue,
  reviewCard,
  deleteDeck,
};
