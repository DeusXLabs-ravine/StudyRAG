import { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, CheckCircle, XCircle, Trophy, ArrowRight } from 'lucide-react';
import * as examService from '../services/examService';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';

export default function Exam() {
  const { documents, fetchDocuments } = useDocumentStore();
  const [phase, setPhase] = useState('config'); // config, exam, results
  const [config, setConfig] = useState({ numQuestions: 20, difficulty: 'medium', timeLimitMinutes: 30, documentId: null });
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const readyDocs = documents.filter(d => d.status === 'ready');

  const startExam = async () => {
    setGenerating(true);
    try {
      const data = await examService.generateExam(config);
      setExam(data);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(data.timeLimitSeconds || config.timeLimitMinutes * 60);
      setStartTime(Date.now());
      setPhase('exam');
      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmit(true);
  };

  const handleSubmit = async (auto = false) => {
    if (!exam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const answerArray = exam.questions.map((_, i) => answers[i] || '');
      const data = await examService.submitExam(exam.id, answerArray, exam.questions, timeSpent);
      setResult(data);
      setPhase('results');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft <= 120;

  // Config phase
  if (phase === 'config') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Exam Mode</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Timed Exam</span>
            </div>
            <p className="text-xs text-purple-600">
              Linear progression. No going back. Auto-submits when time expires.
              Questions are AI-generated and adaptive to your weak areas.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
              <select
                value={config.numQuestions}
                onChange={e => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={10}>10 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={30}>30 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={config.difficulty}
                onChange={e => setConfig({ ...config, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
              <select
                value={config.timeLimitMinutes}
                onChange={e => setConfig({ ...config, timeLimitMinutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <select
                value={config.documentId || ''}
                onChange={e => setConfig({ ...config, documentId: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Documents</option>
                {readyDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startExam}
            disabled={generating}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? <Spinner size="sm" /> : <Timer className="h-5 w-5" />}
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  // Exam phase
  if (phase === 'exam' && exam) {
    const question = exam.questions[currentQ];
    const totalQ = exam.questions.length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Timer header */}
        <div className={`flex items-center justify-between mb-6 p-3 rounded-lg ${isLowTime ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
          <span className="text-sm font-medium text-gray-700">
            Question {currentQ + 1} of {totalQ}
          </span>
          <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isLowTime ? 'text-red-600' : 'text-gray-700'}`}>
            <Timer className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-base font-medium text-gray-900 mb-4">{question.question}</p>

          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((opt, i) => {
                const letter = opt.charAt(0);
                const isSelected = answers[currentQ] === letter;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQ]: letter })}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => (
                <button
                  key={val}
                  onClick={() => setAnswers({ ...answers, [currentQ]: val })}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    answers[currentQ] === val
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next / Submit */}
        <div className="flex justify-end">
          {currentQ < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              className="flex items-center gap-1 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
              Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  // Results phase
  if (phase === 'results' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Trophy className={`h-16 w-16 mx-auto mb-3 ${result.score >= 70 ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h1 className="text-3xl font-bold text-gray-900">
            {result.score >= 90 ? 'Excellent!' : result.score >= 70 ? 'Well Done!' : result.score >= 50 ? 'Keep Trying' : 'Needs Work'}
          </h1>
          <p className="text-5xl font-bold mt-3 text-primary-600">{result.score}%</p>
          <p className="text-gray-500 mt-2">
            {result.correct} of {result.total} correct
            {result.timeSpentSeconds && ` in ${Math.floor(result.timeSpentSeconds / 60)}m ${result.timeSpentSeconds % 60}s`}
          </p>
        </div>

        {/* Results breakdown */}
        <div className="space-y-3 mb-8">
          {result.results.map((r, i) => (
            <div key={i} className={`p-4 rounded-lg border ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {r.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.question}</p>
                  {!r.isCorrect && (
                    <p className="text-xs text-red-600 mt-1">
                      Your answer: {r.userAnswer || 'No answer'} | Correct: {r.correctAnswer}
                    </p>
                  )}
                  {r.explanation && (
                    <p className="text-xs text-gray-600 mt-1">{r.explanation}</p>
                  )}
                  {r.topic && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{r.topic}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase('config'); setExam(null); setResult(null); }}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Take Another Exam
          </button>
          <button
            onClick={() => window.location.href = '/analytics'}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            View Analytics
          </button>
        </div>
      </div>
    );
  }

  return null;
}
