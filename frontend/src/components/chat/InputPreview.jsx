import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

// Detect if text contains any formatting worth previewing
function hasFormatting(text) {
  if (!text || text.length < 2) return false;
  return /\$[^$]+\$|\*\*.+\*\*|\*.+\*|`.+`|~~.+~~|^\s*[-*+]\s|^\s*\d+\.\s|^\s*#{1,6}\s|^\s*>/m.test(text);
}

export default function InputPreview({ text }) {
  const shouldShow = useMemo(() => hasFormatting(text), [text]);

  if (!shouldShow) return null;

  return (
    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/60 rounded-t-2xl">
      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Preview</div>
      <div className="text-sm font-medium text-gray-800 leading-relaxed input-preview-markdown overflow-x-auto max-h-32 overflow-y-auto">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p({ children }) { return <p className="mb-1 last:mb-0">{children}</p>; },
            code({ inline, className, children, ...props }) {
              if (inline || !className) {
                return <code className="px-1 py-0.5 bg-gray-200 text-pink-600 rounded text-[0.85em] font-mono" {...props}>{children}</code>;
              }
              return <code className="block p-2 my-1 bg-gray-900 text-gray-100 rounded-lg text-[0.85em] font-mono overflow-x-auto whitespace-pre" {...props}>{children}</code>;
            },
            ul({ children }) { return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>; },
            blockquote({ children }) { return <blockquote className="pl-3 border-l-2 border-blue-300 my-1 text-gray-600 italic">{children}</blockquote>; },
            table({ children }) { return <div className="overflow-x-auto my-1"><table className="min-w-full text-xs border-collapse border border-gray-200">{children}</table></div>; },
            th({ children }) { return <th className="px-2 py-1 text-left border-b border-gray-300 bg-gray-100 font-black text-xs">{children}</th>; },
            td({ children }) { return <td className="px-2 py-1 border-b border-gray-100 text-xs">{children}</td>; },
            a({ href, children }) { return <a href={href} className="text-blue-600 underline">{children}</a>; },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
