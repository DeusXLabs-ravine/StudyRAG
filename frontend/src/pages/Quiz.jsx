import { useState } from 'react';
import { ClipboardCheck, Play, CheckCircle, XCircle, RotateCcw, Trophy, Zap } from 'lucide-react';
import * as quizService from '../services/quizService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import { useEffect } from 'react';

export default function Quiz() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [config, setConfig] = useState({ numQuestions: 10, difficulty: 'medium', documentId: null, adaptive: false });
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('config'); // config, quiz, result

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const readyDocs = (documents || []).filter(d => d.status === 'ready');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await quizService.generateQuiz(config);
      setQuiz(data);
      setAnswers({});
      setCurrentQ(0);
      setView('quiz');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const answerArray = quiz.questions.map(q => answers[q.id] || '');
      const data = await quizService.submitQuiz(quiz.id, answerArray, quiz.questions);
      setResult(data);
      setView('result');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setView('config');
  };

  // Config view
  if (view === 'config') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Quiz Mode</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure Your Quiz</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <select
                value={config.documentId || ''}
                onChange={e => setConfig(prev => ({ ...prev, documentId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Documents</option>
                {readyDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
              <select
                value={config.numQuestions}
                onChange={e => setConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
                      config.difficulty === level
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.adaptive}
                  onChange={e => setConfig(prev => ({ ...prev, adaptive: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Zap className="h-4 w-4 text-purple-500" /> Adaptive Mode
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Focus questions on your weak topics for targeted practice.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz view
  if (view === 'quiz' && quiz) {
    const q = quiz.questions[currentQ];
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">Quiz</h1>
          <span className="text-sm text-gray-500">
            Question {currentQ + 1} of {quiz.questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-primary-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{q.question}</h3>

          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map((option, i) => {
                const letter = option.charAt(0);
                const isSelected = answers[q.id] === letter;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(q.id, letter)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => (
                <button
                  key={val}
                  onClick={() => handleAnswer(q.id, val)}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    answers[q.id] === val
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Previous
            </button>
            {currentQ < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={answeredCount < quiz.questions.length || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Result view
  if (view === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
          <Trophy className={`h-16 w-16 mx-auto mb-4 ${result.score >= 70 ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Quiz Complete!</h2>
          <p className="text-4xl font-bold mb-1" style={{ color: result.score >= 70 ? '#16a34a' : '#dc2626' }}>
            {result.score}%
          </p>
          <p className="text-gray-500 text-sm">{result.correct} of {result.total} correct</p>
        </div>

        <div className="space-y-3 mb-6">
          {result.results.map((r, i) => (
            <div key={i} className={`p-4 rounded-lg border ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {r.isCorrect
                  ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.question}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your answer: <span className="font-medium">{r.userAnswer || 'No answer'}</span>
                    {!r.isCorrect && <> | Correct: <span className="font-medium text-green-700">{r.correctAnswer}</span></>}
                  </p>
                  {r.explanation && <p className="text-xs text-gray-500 mt-1">{r.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleRetry}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          <RotateCcw className="h-4 w-4" /> Take Another Quiz
        </button>
      </div>
    );
  }

  return null;
}
