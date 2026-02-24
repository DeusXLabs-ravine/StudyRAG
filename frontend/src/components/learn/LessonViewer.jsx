import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, Lightbulb, HelpCircle, X, CheckCircle, Lock, ChevronRight, Shapes } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { explainSimply } from '../../services/moduleService';
import Spinner from '../common/Spinner';
import TTSButton from '../common/TTSButton';
import DiagramViewer from './DiagramViewer';
import useSettingsStore from '../../store/settingsStore';
import { resolveThemeVars, getBoardType, parseThemeSetting } from '../../lib/boardThemes';

export default function LessonViewer({ module, onStartQuiz, regeneratingQuestions, diagrams = [], teachingLevel }) {
  if (!module) return null;

  const settings = useSettingsStore(state => state.settings);

  const { themeVars, boardType } = useMemo(() => {
    const cfg = parseThemeSetting(settings.board_theme);
    return {
      themeVars: resolveThemeVars(cfg),
      boardType: getBoardType(cfg),
    };
  }, [settings.board_theme]);

  const isNotebook = boardType === 'notebook';
  const isWhiteboard = boardType === 'whiteboard';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Learning Board */}
      <div className="lesson-board relative" style={themeVars}>
        <div className="board-texture" />

        {/* Notebook decorations (hidden by CSS var for non-notebook) */}
        <div className="board-notebook-lines" />
        <div className="board-margin-line" />
        <div className="board-spiral hidden sm:block">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="board-spiral-ring" />
          ))}
        </div>

        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 mb-10 border-b pb-6"
          style={{ borderColor: 'var(--header-border-color)' }}
        >
          <div className="board-text flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
              <span
                className="px-3 py-1 text-[10px] md:text-xs font-bold rounded-sm uppercase tracking-widest"
                style={{
                  background: 'var(--label-bg)',
                  color: 'var(--label-color)',
                  border: 'var(--label-border)',
                }}
              >
                Module {module.orderIndex + 1}
              </span>
              {module.topic && (
                <span
                  className="px-3 py-1 text-[10px] md:text-xs font-semibold rounded-sm text-nowrap"
                  style={{
                    background: 'var(--label-bg)',
                    color: 'var(--label-color)',
                    border: 'var(--label-border)',
                    opacity: 0.7,
                  }}
                >
                  {module.topic}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">{module.title}</h2>
          </div>
          <div className="w-full md:w-auto flex justify-end">
            <TTSButton text={module.content} variant={isWhiteboard || isNotebook ? 'default' : 'chalk'} />
          </div>
        </div>

        <div className="board-text board-writing">
          {/* Learning Objectives */}
          {module.objectives?.length > 0 && (
            <div className="mb-8 md:mb-12 opacity-80">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <Target className="h-5 w-5 md:h-6 md:w-6" style={{ color: 'var(--text-color)' }} />
                <h3 className="text-lg md:text-xl font-bold m-0 border-none">Today's Objectives:</h3>
              </div>
              <ul className="list-none grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-0">
                {module.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 text-base md:text-lg leading-snug">
                    <span className="opacity-50">#</span> {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lesson Content */}
          <div className="max-w-none mb-12">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="mb-6">{children}</p>,
                h2: ({ children }) => <h2 className="text-xl md:text-2xl mt-12 mb-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg md:text-xl mt-8 mb-4">{children}</h3>,
                li: ({ children }) => <li className="mb-2 list-['-'] ml-4 pl-2 text-base md:text-lg">{children}</li>,
              }}
            >
              {module.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Board Tray */}
        <div className="board-tray">
          {isWhiteboard ? (
            <>
              <div className="board-marker" style={{ background: 'var(--tray-item-1-bg)' }} />
              <div className="board-marker" style={{ background: 'var(--tray-item-2-bg)' }} />
              <div className="board-eraser" />
            </>
          ) : (
            <>
              <div className="board-tray-item" style={{ background: 'var(--tray-item-1-bg)' }} />
              <div className="board-tray-item" style={{ background: 'var(--tray-item-2-bg)', transform: 'rotate(5deg)' }} />
              <div className="board-eraser" />
            </>
          )}
        </div>
      </div>

      {/* Navigation / Quiz trigger */}
      <div className="flex justify-center md:justify-end">
        <button
          onClick={onStartQuiz}
          disabled={regeneratingQuestions}
          className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-2xl text-sm font-extrabold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
        >
          {regeneratingQuestions ? (
            <><Spinner size="xs" /> Preparing New Questions...</>
          ) : (
            <>Check Comprehension <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {/* Key Takeaways */}
      {module.takeaways?.length > 0 && (
        <div className="sleek-card p-6 md:p-8 bg-emerald-50/20 border-emerald-100/30">
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
