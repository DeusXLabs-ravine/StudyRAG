import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionSquare, ChevronUp, ChevronDown } from 'lucide-react';
import katex from 'katex';

const FORMULA_GROUPS = [
  {
    label: 'Greek',
    items: [
      { display: 'α', insert: 'α', tex: '\\alpha', direct: true },
      { display: 'β', insert: 'β', tex: '\\beta', direct: true },
      { display: 'γ', insert: 'γ', tex: '\\gamma', direct: true },
      { display: 'δ', insert: 'δ', tex: '\\delta', direct: true },
      { display: 'θ', insert: 'θ', tex: '\\theta', direct: true },
      { display: 'λ', insert: 'λ', tex: '\\lambda', direct: true },
      { display: 'μ', insert: 'μ', tex: '\\mu', direct: true },
      { display: 'π', insert: 'π', tex: '\\pi', direct: true },
      { display: 'σ', insert: 'σ', tex: '\\sigma', direct: true },
      { display: 'φ', insert: 'φ', tex: '\\phi', direct: true },
      { display: 'ω', insert: 'ω', tex: '\\omega', direct: true },
      { display: 'Δ', insert: 'Δ', tex: '\\Delta', direct: true },
      { display: 'Σ', insert: 'Σ', tex: '\\Sigma', direct: true },
      { display: 'Ω', insert: 'Ω', tex: '\\Omega', direct: true },
    ]
  },
  {
    label: 'Operators',
    items: [
      { display: '±', insert: '±', tex: '\\pm', direct: true },
      { display: '×', insert: '×', tex: '\\times', direct: true },
      { display: '÷', insert: '÷', tex: '\\div', direct: true },
      { display: '≠', insert: '≠', tex: '\\neq', direct: true },
      { display: '≤', insert: '≤', tex: '\\leq', direct: true },
      { display: '≥', insert: '≥', tex: '\\geq', direct: true },
      { display: '≈', insert: '≈', tex: '\\approx', direct: true },
      { display: '∞', insert: '∞', tex: '\\infty', direct: true },
      { display: '∝', insert: '∝', tex: '\\propto', direct: true },
      { display: '→', insert: '→', tex: '\\rightarrow', direct: true },
      { display: '⇒', insert: '⇒', tex: '\\Rightarrow', direct: true },
      { display: '∈', insert: '∈', tex: '\\in', direct: true },
    ]
  },
  {
    label: 'Functions',
    items: [
      { display: '√', insert: '\\sqrt{}', tex: '\\sqrt{x}', cursor: -1 },
      { display: 'x²', insert: '^{2}', tex: 'x^{2}' },
      { display: 'xⁿ', insert: '^{}', tex: 'x^{n}', cursor: -1 },
      { display: 'x₁', insert: '_{}', tex: 'x_{1}', cursor: -1 },
      { display: '∫', insert: '\\int_{a}^{b}', tex: '\\int_{a}^{b}' },
      { display: 'Σ', insert: '\\sum_{i=1}^{n}', tex: '\\sum_{i=1}^{n}' },
      { display: '∏', insert: '\\prod_{i=1}^{n}', tex: '\\prod_{i=1}^{n}' },
      { display: 'lim', insert: '\\lim_{x \\to \\infty}', tex: '\\lim_{x \\to \\infty}' },
      { display: 'a/b', insert: '\\frac{}{}', tex: '\\frac{a}{b}', cursor: -1 },
      { display: '∂', insert: '∂', tex: '\\partial', direct: true },
      { display: '∇', insert: '∇', tex: '\\nabla', direct: true },
      { display: 'log', insert: 'log', tex: '\\log', direct: true },
    ]
  },
  {
    label: 'Trig',
    items: [
      { display: 'sin', insert: 'sin', tex: '\\sin', direct: true },
      { display: 'cos', insert: 'cos', tex: '\\cos', direct: true },
      { display: 'tan', insert: 'tan', tex: '\\tan', direct: true },
      { display: 'sin⁻¹', insert: 'arcsin', tex: '\\arcsin', direct: true },
      { display: 'cos⁻¹', insert: 'arccos', tex: '\\arccos', direct: true },
      { display: 'tan⁻¹', insert: 'arctan', tex: '\\arctan', direct: true },
    ]
  },
  {
    label: 'Brackets',
    items: [
      { display: '( )', insert: '( )', tex: '\\left( \\right)', direct: true },
      { display: '[ ]', insert: '[ ]', tex: '\\left[ \\right]', direct: true },
      { display: '{ }', insert: '{ }', tex: '\\left\\{ \\right\\}', direct: true },
      { display: '| |', insert: '| |', tex: '\\left| \\right|', direct: true },
      { display: '⌈ ⌉', insert: '⌈ ⌉', tex: '\\lceil \\rceil', direct: true },
      { display: '⌊ ⌋', insert: '⌊ ⌋', tex: '\\lfloor \\rfloor', direct: true },
    ]
  },
  {
    label: 'Structures',
    items: [
      { display: 'matrix', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { display: 'cases', insert: '\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{otherwise} \\end{cases}', tex: '\\begin{cases} x \\\\ -x \\end{cases}' },
      { display: 'vec', insert: '\\vec{}', tex: '\\vec{v}', cursor: -1 },
      { display: 'hat', insert: '\\hat{}', tex: '\\hat{x}', cursor: -1 },
      { display: 'bar', insert: '\\bar{}', tex: '\\bar{x}', cursor: -1 },
      { display: 'dot', insert: '\\dot{}', tex: '\\dot{x}', cursor: -1 },
    ]
  }
];

function renderKatexPreview(text) {
  try {
    // Extract math from $ delimiters or render raw
    const mathContent = text.match(/\$\$(.*?)\$\$/s)?.[1] || text.match(/\$(.*?)\$/)?.[1] || text;
    if (!mathContent.trim()) return '';
    return katex.renderToString(mathContent, { throwOnError: false, displayMode: text.includes('$$') });
  } catch {
    return '';
  }
}

export default function FormulaInput({ textareaRef, onInsert }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [previewText, setPreviewText] = useState('');

  const handleInsert = (item) => {
    const textarea = textareaRef?.current;
    if (!textarea && !onInsert) return;

    // Direct items (Greek, operators, trig, brackets) insert their Unicode symbol
    // Complex items (fractions, integrals, matrices) get wrapped in $...$ for LaTeX
    const insertText = item.direct ? item.insert : `$${item.insert}$`;

    if (onInsert) {
      onInsert(insertText, item.direct ? undefined : item.cursor);
      return;
    }

    // Insert at cursor position in textarea
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const newValue = before + insertText + after;

    // Trigger React's onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Position cursor
    const cursorPos = item.cursor && !item.direct ? start + insertText.length + item.cursor : start + insertText.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
      textarea.focus();
    }, 0);
  };

  // Live preview of text in preview area
  const previewHtml = previewText ? renderKatexPreview(previewText) : '';

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isOpen ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'
          }`}
        title="Math formula toolbar"
      >
        <FunctionSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">f(x)</span>
        {isOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
      </button>

      {/* Formula Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
          >
            {/* Live Preview */}
            {previewHtml && (
              <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-center">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            )}

            {/* Group Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
              {FORMULA_GROUPS.map((group, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGroup(i)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${activeGroup === i ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            {/* Symbol Grid */}
            <div className="p-2 grid grid-cols-6 gap-1 max-h-36 overflow-y-auto">
              {FORMULA_GROUPS[activeGroup].items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleInsert(item)}
                  onMouseEnter={() => setPreviewText(`$${item.tex}$`)}
                  onMouseLeave={() => setPreviewText('')}
                  className="flex items-center justify-center px-1 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-sm font-bold text-gray-700 hover:text-indigo-700 transition-all active:scale-95"
                  title={item.insert}
                >
                  {item.display}
                </button>
              ))}
            </div>

            {/* Wrap selection tip */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
              <p className="text-[9px] text-gray-400 font-medium">
                Click to insert at cursor. Use $...$ for inline math, $$...$$ for display math.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
