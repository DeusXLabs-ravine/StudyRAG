import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, Lightbulb, HelpCircle, X } from 'lucide-react';
import { explainSimply } from '../../services/moduleService';
import Spinner from '../common/Spinner';

export default function LessonViewer({ module }) {
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  if (!module) return null;

  const handleExplainSimply = async (question = '') => {
    setExplainLoading(true);
    setShowExplainPanel(true);
    try {
      const result = await explainSimply(module.id, question);
      setExplanation(result);
    } catch (err) {
      setExplanation('Sorry, I had trouble generating a simpler explanation. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="sleek-card overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-widest">
            Module {module.orderIndex + 1}
          </span>
          {module.topic && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
              {module.topic}
            </span>
          )}
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{module.title}</h2>
      </div>

      <div className="px-8 py-10">
        {/* Learning Objectives */}
        {module.objectives?.length > 0 && (
          <div className="mb-10 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-blue-900">Learning Objectives</h3>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {module.objectives.map((obj, i) => (
                <li key={i} className="text-sm text-blue-800 flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lesson Content */}
        <div className="prose prose-lg max-w-none mb-12 prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-primary prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown>{module.content}</ReactMarkdown>
        </div>

        {/* I Don't Understand Button */}
        <div className="mb-10 p-6 bg-purple-50/50 rounded-2xl border border-purple-100/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-purple-900">Struggling with this?</span>
                <span className="text-xs text-purple-700">Get a simplified explanation from AI</span>
              </div>
            </div>
            <button
              onClick={() => handleExplainSimply()}
              disabled={explainLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              {explainLoading ? <Spinner size="sm" /> : <Lightbulb className="h-4 w-4" />}
              Explain Simply
            </button>
          </div>
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={e => setCustomQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customQuestion.trim() && handleExplainSimply(customQuestion)}
              placeholder="What specifically confuses you? (optional)"
              className="flex-1 px-4 py-3 border border-purple-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-200 outline-none transition-all"
            />
            {customQuestion.trim() && (
              <button
                onClick={() => handleExplainSimply(customQuestion)}
                disabled={explainLoading}
                className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-200 transition-all"
              >
                Ask
              </button>
            )}
          </div>
        </div>

        {/* Simplified Explanation Panel */}
        {showExplainPanel && (
          <div className="mb-10 p-8 bg-amber-50 rounded-2xl border border-amber-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" /> Simplified Explanation
              </h3>
              <button
                onClick={() => { setShowExplainPanel(false); setExplanation(''); setCustomQuestion(''); }}
                className="p-2 text-amber-500 hover:text-amber-700 hover:bg-white/50 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {explainLoading ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <Spinner size="lg" />
                <span className="text-sm font-medium text-amber-700">Synthesizing a simpler version...</span>
              </div>
            ) : (
              <div className="prose prose-amber max-w-none text-amber-900">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Key Takeaways */}
        {module.takeaways?.length > 0 && (
          <div className="p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Key Takeaways</h3>
            </div>
            <ul className="space-y-3">
              {module.takeaways.map((t, i) => (
                <li key={i} className="text-sm text-emerald-800 flex items-start gap-4">
                  <div className="mt-1 w-5 h-5 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    {i + 1}
                  </div>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
