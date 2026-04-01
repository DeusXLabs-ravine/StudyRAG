import { useState, useEffect } from 'react';
import { Layers, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Shuffle, Play, Zap, Trash2, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import * as flashcardService from '../services/flashcardService';
import useDocumentStore from '../store/documentStore';
import { MorphingSquare } from '../components/ui/morphing-square';
import { AILoader } from '../components/ui/ai-loader';
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
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(() => {
    fetchDocuments();
    loadDecks();
  }, [fetchDocuments]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const loadDecks = async () => {
    setLoading(true);
    try {
      const data = await flashcardService.listFlashcards();
      setDecks(Array.isArray(data) ? data : []);
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
      setSessionStartTime(Date.now());
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
      setSessionStartTime(Date.now());
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
      setSessionStartTime(Date.now());
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReview = async (quality) => {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    const durationSeconds = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : null;
    try {
      const updatedCard = await flashcardService.reviewFlashcard(card.id, quality, durationSeconds);
      const updatedCards = [...currentDeck.cards];
      updatedCards[currentIndex] = updatedCard;
      setCurrentDeck({ ...currentDeck, cards: updatedCards });
    } catch (err) {
      // ignore
    }
    // Reset timer for next card or keep it cumulative? 
    // Usually study session duration is for the whole session.
    // If I reset it here, I get per-card time. If I don't, I get cumulative time.
    // The RPC 'get_study_time_by_mode' sums duration_seconds.
    // If I want total time per day, cumulative is risky if I don't reset.
    // Wait, if I don't reset, and I have 20 cards, each 'review' call will have 
    // a larger and larger duration. Summing them would be wrong.
    // So I should reset it.
    setSessionStartTime(Date.now());

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
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Flashcard Decks</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Master key concepts through spaced repetition.</p>
        </div>

        {/* Generate new deck */}
        <div className="bg-white rounded-[2rem] p-6 md:p-8 mb-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
          <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            Create New Deck
          </h2>
          <div className="flex flex-col sm:flex-row items-end gap-4 relative z-10">
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-500 mb-2">Source Material</label>
              <div className="relative group">
                <select
                  value={selectedDocId || ''}
                  onChange={e => setSelectedDocId(e.target.value || null)}
                  className="w-full appearance-none px-5 py-3.5 bg-gray-50 border-0 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none pr-10 hover:bg-gray-100"
                >
                  <option value="">All Documents</option>
                  {readyDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-blue-500 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              {generating ? <MorphingSquare size="sm" /> : <Play className="h-5 w-5" />}
              Generate Deck
            </button>
          </div>
        </div>

        <div className="p-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-[2rem] shadow-xl shadow-blue-200 text-white mb-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-150 duration-700 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                <Zap className="h-6 w-6 text-amber-300 animate-pulse" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Smart Review</h2>
            </div>
            <p className="text-white/90 font-medium mb-6 max-w-md leading-relaxed">
              AI-generated cards focused on concepts where you've shown lower mastery across all materials.
            </p>
            <button
              onClick={handleGenerateAdaptive}
              disabled={generating}
              className="flex items-center gap-3 px-8 py-3.5 bg-white text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {generating ? <MorphingSquare size="sm" /> : <Zap className="h-5 w-5" />}
              Create Smart Deck
            </button>
          </div>
        </div>

        {/* Existing decks */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved Decks</h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{decks.length} Decks</span>
          </div>

          {loading ? (
            <div className="sleek-card p-20 flex flex-col items-center justify-center gap-4">
              <MorphingSquare size="lg" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Library</p>
            </div>
          ) : decks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {decks.map(deck => {
                const stats = getCardStats(deck.cards);
                return (
                  <div
                    key={deck.id}
                    className="bg-white rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-lg border border-gray-100 transition-all group hover:border-purple-200"
                  >
                    <button
                      onClick={() => { setCurrentDeck(deck); setCurrentIndex(0); setFlipped(false); setStudyMode(false); setSessionStartTime(Date.now()); }}
                      className="flex items-center gap-5 min-w-0 w-full flex-1 text-left"
                    >
                      <div className="w-16 h-16 bg-blue-50 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Layers className="h-7 w-7 text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-gray-900 truncate mb-1.5 group-hover:text-blue-600 transition-colors">
                          {deck.name || `${deck.cards.length} Cards`}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{stats.new} New</span>
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{stats.learning} Study</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{stats.mastered} Done</span>
                        </div>
                      </div>
                    </button>
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                      <button
                        onClick={() => startSmartStudy(deck.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 rounded-2xl font-black text-xs hover:bg-blue-100 hover:text-blue-800 transition-all active:scale-95 shadow-sm"
                        title="Smart Study"
                      >
                        <Clock className="h-4 w-4" /> Smart Study
                      </button>
                      <button
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        title="Delete deck"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sleek-card p-24 text-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Layers className="h-10 w-10 opacity-30" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">No flashcards yet</h3>
              <p className="text-gray-500 max-w-xs mx-auto font-medium">Generate a deck from your documents to start mastering concepts.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Flashcard study view
  const stats = getCardStats(currentDeck.cards);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => { setCurrentDeck(null); setStudyMode(false); loadDecks(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:text-primary transition-all active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Decks
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Progress</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">
              {currentIndex + 1} / {currentDeck.cards.length}
            </span>
            {studyMode && currentDeck.dueCount !== undefined && (
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">{currentDeck.dueCount} Due</span>
            )}
          </div>
        </div>
        <button
          onClick={handleShuffle}
          className="p-2.5 text-gray-400 hover:text-primary rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          title="Shuffle Deck"
        >
          <Shuffle className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / currentDeck.cards.length) * 100}%` }}
          className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] transition-all"
        />
      </div>

      {/* Card area */}
      {currentCard && (
        <div className="mb-10">
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full cursor-pointer"
            style={{ perspective: '2000px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={flipped ? 'back' : 'front'}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className={`w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center p-8 md:p-12 rounded-[2.5rem] border text-center shadow-xl transition-colors ${flipped
                  ? 'bg-emerald-50/50 border-emerald-100 shadow-emerald-50/40 text-emerald-900'
                  : 'bg-white border-blue-100 shadow-blue-50/50'
                  }`}
              >
                <div className="max-w-md">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">
                    {flipped ? 'Correct Answer' : 'Question'}
                  </p>
                  <div className="text-xl md:text-3xl font-black text-gray-900 leading-tight prose prose-xl max-w-none [&_p]:mb-1 [&_ul]:text-left [&_ol]:text-left">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{flipped ? currentCard.back : currentCard.front}</ReactMarkdown>
                  </div>
                  {currentCard.topic && (
                    <div className="mt-8 flex justify-center">
                      <span className="text-[10px] font-black text-primary/50 bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                        {currentCard.topic}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center mt-6">
            <TTSButton text={flipped ? currentCard.back : currentCard.front} scale={1.2} />
          </div>
        </div>
      )}

      {/* Rating Buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          >
            {QUALITY_BUTTONS.map(btn => (
              <button
                key={btn.quality}
                onClick={() => handleReview(btn.quality)}
                className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-2xl text-xs font-black ${btn.color} border border-transparent hover:border-current/20 transition-all shadow-sm active:scale-95`}
              >
                <span>{btn.label}</span>
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">{btn.desc}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation and Stats */}
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}
            disabled={currentIndex === 0}
            className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={() => { setCurrentIndex(Math.min(currentDeck.cards.length - 1, currentIndex + 1)); setFlipped(false); }}
            disabled={currentIndex === currentDeck.cards.length - 1}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-primary/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span className="text-blue-500">New: {stats.new}</span>
          <span className="text-amber-500">Learning: {stats.learning}</span>
          <span className="text-emerald-500">Done: {stats.mastered}</span>
        </div>
      </div>
    </div>
  );
}
