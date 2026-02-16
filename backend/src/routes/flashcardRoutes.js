const express = require('express');
const router = express.Router();
const {
  createFlashcards,
  createAdaptiveFlashcards,
  listFlashcards,
  getDeck,
  getDeckStudyQueue,
  reviewFlashcard,
  removeDeck,
} = require('../controllers/flashcardController');

router.get('/', listFlashcards);
router.post('/generate', createFlashcards);
router.post('/generate-adaptive', createAdaptiveFlashcards);
router.get('/:id', getDeck);
router.get('/:id/study-queue', getDeckStudyQueue);
router.put('/:id/review', reviewFlashcard);
router.delete('/:id', removeDeck);

module.exports = router;
