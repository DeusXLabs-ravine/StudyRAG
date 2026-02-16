const {
  generateFlashcards,
  generateAdaptiveFlashcards,
  getAllFlashcards,
  getFlashcardDeck,
  getStudyQueue,
  reviewCard,
  deleteDeck,
} = require('../services/flashcardGenerator');

async function createFlashcards(req, res, next) {
  try {
    const { numCards = 20, documentId, name } = req.body;
    const deck = await generateFlashcards({ numCards, docId: documentId, name });
    res.json(deck);
  } catch (error) {
    next(error);
  }
}

async function createAdaptiveFlashcards(req, res, next) {
  try {
    const { numCards = 20 } = req.body;
    const deck = await generateAdaptiveFlashcards({ numCards });
    res.json(deck);
  } catch (error) {
    next(error);
  }
}

async function listFlashcards(req, res, next) {
  try {
    const decks = await getAllFlashcards();
    res.json({ decks });
  } catch (error) {
    next(error);
  }
}

async function getDeck(req, res, next) {
  try {
    const deck = await getFlashcardDeck(req.params.id);
    if (!deck) {
      return res.status(404).json({ error: 'Flashcard deck not found' });
    }
    res.json(deck);
  } catch (error) {
    next(error);
  }
}

async function getDeckStudyQueue(req, res, next) {
  try {
    const queue = await getStudyQueue(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Flashcard deck not found' });
    }
    res.json(queue);
  } catch (error) {
    next(error);
  }
}

async function reviewFlashcard(req, res, next) {
  try {
    const { quality, status } = req.body;
    const { id: cardId } = req.params;

    // Support both new quality-based and old status-based reviews
    let qualityValue;
    if (quality !== undefined) {
      qualityValue = quality;
    } else if (status) {
      // Backward compat: map old status to quality
      qualityValue = status === 'know' ? 4 : 2;
    } else {
      return res.status(400).json({ error: 'Either quality (1-4) or status (know/review) is required' });
    }

    if (qualityValue < 1 || qualityValue > 4) {
      return res.status(400).json({ error: 'Quality must be between 1 and 4' });
    }

    const card = await reviewCard(cardId, qualityValue);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    next(error);
  }
}

async function removeDeck(req, res, next) {
  try {
    await deleteDeck(req.params.id);
    res.json({ message: 'Deck deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createFlashcards,
  createAdaptiveFlashcards,
  listFlashcards,
  getDeck,
  getDeckStudyQueue,
  reviewFlashcard,
  removeDeck,
};
