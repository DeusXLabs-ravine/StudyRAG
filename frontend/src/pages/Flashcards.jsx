import { useState, useEffect } from 'react';
import { Layers, RotateCcw, ChevronLeft, ChevronRight, Shuffle, Play, Zap, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as flashcardService from '../services/flashcardService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import TTSButton from '../components/common/TTSButton';

const QUALITY_BUTTONS = [
  { quality: 1, label: 'Again', color: 'bg-red-50 text-red-600 hover:bg-red-100', desc: 'Forgot completely' },
  { quality: 2, label: 'Hard', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100', desc: 'Took effort' },
  { quality: 3, label: 'Good', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', desc: 'Recalled correctly' },
  { quality: 4, label: 'Easy', color: 'bg-green-50 text-green-600 hover:bg-green-100', desc: 'Instant recall' },
];

export default function Flashcards() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [studyMode, setStudyMode] = useState(false); // smart study mode

  useEffect(() => {
    fetchDocuments();
    loadDecks();
  }, [fetchDocuments]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const loadDecks = async () => {
    setLoading(true);
    try {
      const data = await flashcardService.listFlashcards();
      setDecks(data);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const deck = await flashcardService.generateFlashcards({
        numCards: 20,
        documentId: selectedDocId,
      });
      setDecks(prev => [...prev, deck]);
      setCurrentDeck(deck);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAdaptive = async () => {
    setGenerating(true);
    try {
      const deck = await flashcardService.generateAdaptiveFlashcards({ numCards: 20 });
      setDecks(prev => [...prev, deck]);
      setCurrentDeck(deck);
      setCurrentIndex(0);
      setFlipped(false);
      setStudyMode(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const startSmartStudy = async (deckId) => {
    try {
      const queue = await flashcardService.getStudyQueue(deckId);
      setCurrentDeck(queue);
      setCurrentIndex(0);
      setFlipped(false);
      setStudyMode(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReview = async (quality) => {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    try {
      const updatedCard = await flashcardService.reviewFlashcard(card.id, quality);
      const updatedCards = [...currentDeck.cards];
      updatedCards[currentIndex] = updatedCard;
      setCurrentDeck({ ...currentDeck, cards: updatedCards });
    } catch (err) {
      // ignore
    }
    // Move to next
    if (currentIndex < currentDeck.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handleShuffle = () => {
    if (!currentDeck) return;
    const shuffled = [...currentDeck.cards].sort(() => Math.random() - 0.5);
    setCurrentDeck({ ...currentDeck, cards: shuffled });
    setCurrentIndex(0);
    setFlipped(false);
  };

  const handleDeleteDeck = async (deckId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this deck?')) return;
    try {
      await flashcardService.deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.id !== deckId));
    } catch (err) {
      // ignore
    }
  };

  const currentCard = currentDeck?.cards[currentIndex];

  const getCardStats = (cards) => {
    if (!cards) return {};
    return {
      new: cards.filter(c => c.status === 'new').length,
      learning: cards.filter(c => c.status === 'learning').length,
      mastered: cards.filter(c => c.status === 'mastered').length,
      total: cards.length,
    };
  };

  // Deck selection / generation view
  if (!currentDeck) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Flashcards</h1>

        {/* Generate new deck */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Generate New Deck</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Document</label>
              <select
                value={selectedDocId || ''}
                onChange={e => setSelectedDocId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Documents</option>
                {readyDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {generating ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
              Generate
            </button>
          </div>
        </div>

        {/* Adaptive generation */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" /> Smart Review Deck
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                AI generates flashcards focused on your weak topics across all materials.
              </p>
            </div>
            <button
              onClick={handleGenerateAdaptive}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? <Spinner size="sm" /> : <Zap className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        {/* Existing decks */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : decks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Decks</h2>
            {decks.map(deck => {
              const stats = getCardStats(deck.cards);
              return (
                <div
                  key={deck.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm hover:border-primary-200 transition-all"
                >
                  <button
                    onClick={() => { setCurrentDeck(deck); setCurrentIndex(0); setFlipped(false); setStudyMode(false); }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {deck.name || `${deck.cards.length} cards`}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-blue-600">{stats.new} new</span>
                      <span className="text-xs text-orange-600">{stats.learning} learning</span>
                      <span className="text-xs text-green-600">{stats.mastered} mastered</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => startSmartStudy(deck.id)}
                      className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg"
                      title="Smart Study"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteDeck(deck.id, e)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                      title="Delete deck"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No flashcard decks yet.</p>
            <p className="text-sm text-gray-400">Generate a deck from your study materials.</p>
          </div>
        )}
      </div>
    );
  }

  // Flashcard study view
  const stats = getCardStats(currentDeck.cards);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { setCurrentDeck(null); setStudyMode(false); loadDecks(); }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {currentDeck.cards.length}
          {studyMode && currentDeck.dueCount !== undefined && (
            <span className="ml-2 text-purple-600">({currentDeck.dueCount} due)</span>
          )}
        </span>
        <button onClick={handleShuffle} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Shuffle className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
        <div
          className="bg-primary-600 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / currentDeck.cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      {currentCard && (
        <div className="mb-6">
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full cursor-pointer"
            style={{ perspective: '1000px', minHeight: '250px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={flipped ? 'back' : 'front'}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`w-full min-h-[250px] flex items-center justify-center p-8 rounded-2xl border-2 text-center ${
                  flipped
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                    {flipped ? 'Answer' : 'Question'}
                  </p>
                  <p className="text-lg font-medium text-gray-900">
                    {flipped ? currentCard.back : currentCard.front}
                  </p>
                  {currentCard.topic && (
                    <p className="text-xs text-gray-400 mt-3">Topic: {currentCard.topic}</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center mt-3">
            <TTSButton text={flipped ? currentCard.back : currentCard.front} />
          </div>
        </div>
      )}

      {/* SM-2 Quality Rating Buttons */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUALITY_BUTTONS.map(btn => (
            <button
              key={btn.quality}
              onClick={() => handleReview(btn.quality)}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium ${btn.color} transition-all`}
            >
              <span>{btn.label}</span>
              <span className="text-[10px] opacity-70">{btn.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}
          disabled={currentIndex === 0}
          className="p-3 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => { setCurrentIndex(Math.min(currentDeck.cards.length - 1, currentIndex + 1)); setFlipped(false); }}
          disabled={currentIndex === currentDeck.cards.length - 1}
          className="p-3 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
        <span className="text-blue-600">{stats.new} new</span>
        <span className="text-orange-600">{stats.learning} learning</span>
        <span className="text-green-600">{stats.mastered} mastered</span>
      </div>
    </div>
  );
}
