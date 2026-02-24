import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, Lightbulb, HelpCircle, X, CheckCircle, Lock, ChevronRight, Shapes } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { explainSimply } from '../../services/moduleService';
import Spinner from '../common/Spinner';
import TTSButton from '../common/TTSButton';
import DiagramViewer from './DiagramViewer';

export default function LessonViewer({ module, onStartQuiz, regeneratingQuestions, diagrams = [], teachingLevel }) {
  if (!module) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Chalkboard Section */}
      <div className="chalkboard relative">
        <div className="chalk-dust" />

        {/* Header inside chalkboard */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 border-b border-white/10 pb-6">
          <div className="chalk-drawing">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded-sm uppercase tracking-widest border border-white/20">
                Module {module.orderIndex + 1}
              </span>
              {module.topic && (
                <span className="px-3 py-1 bg-white/5 text-white/70 text-xs font-semibold rounded-sm border border-white/10 text-nowrap">
                  {module.topic}
                </span>
              )}
            </div>
            <h2 className="text-4xl font-bold tracking-tight">{module.title}</h2>
          </div>
          <TTSButton text={module.content} variant="chalk" />
        </div>

        <div className="chalk-drawing chalk-writing">
          {/* Learning Objectives - Chalk Style */}
          {module.objectives?.length > 0 && (
            <div className="mb-12 opacity-80">
              <div className="flex items-center gap-3 mb-6">
                <Target className="h-6 w-6 text-white" />
                <h3 className="text-xl font-bold m-0 border-none">Today's Objectives:</h3>
              </div>
              <ul className="list-none grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-0">
                {module.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg leading-snug">
                    <span className="opacity-50">#</span> {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lesson Content - Chalk Style */}
          <div className="prose-invert max-w-none mb-12">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="mb-6">{children}</p>,
                h2: ({ children }) => <h2 className="text-2xl mt-12 mb-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl mt-8 mb-4">{children}</h3>,
                li: ({ children }) => <li className="mb-2 list-['-'] ml-4 pl-2">{children}</li>,
              }}
            >
              {module.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Chalk Tray Props */}
        <div className="chalk-tray-items">
          <div className="chalk-stick" />
          <div className="chalk-stick bg-blue-100/80" style={{ transform: 'rotate(5deg)' }} />
          <div className="chalk-eraser" />
        </div>
      </div>

      {/* Navigation / Quiz trigger */}
      <div className="flex justify-end">
        <button
          onClick={onStartQuiz}
          disabled={regeneratingQuestions}
          className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-extrabold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-3 disabled:opacity-70"
        >
          {regeneratingQuestions ? (
            <><Spinner size="xs" /> Preparing New Questions...</>
          ) : (
            <>Check Comprehension <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {/* Key Takeaways - Moved below as a simple card */}
      {module.takeaways?.length > 0 && (
        <div className="sleek-card p-8 bg-emerald-50/20 border-emerald-100/30">
          <div className="flex items-center gap-3 mb-6 font-bold text-emerald-900/80">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="text-lg">Main Takeaways</h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {module.takeaways.map((t, i) => (
              <li key={i} className="text-sm text-emerald-800/80 flex items-start gap-3 leading-relaxed">
                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual Diagrams */}
      {diagrams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Shapes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Visual Diagrams</h3>
              <p className="text-xs text-gray-500">Detected diagrams from your document, simplified for your level</p>
            </div>
          </div>
          <div className="space-y-4">
            {diagrams.map(d => (
              <DiagramViewer key={d.id} diagram={d} teachingLevel={teachingLevel || 'intermediate'} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
