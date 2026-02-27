import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

let renderCounter = 0;

export default function MermaidDiagram({ code, id }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    const renderKey = `mermaid-${id || 'diagram'}-${++renderCounter}`;

    (async () => {
      try {
        setError(null);

        // Preprocessing for Mermaid AI Output:
        // 1. Replace legacy 'graph' with 'flowchart' (more resilient in mermaid v11)
        // 2. Convert labeled-edge syntax that mermaid doesn't support:
        //    - A -- label --> B  => A -->|label| B
        //    - A -- label -- B   => A ---|label| B
        // 3. Sanitize newlines inside node labels
        let sanitizedCode = code
          // 1. Replace legacy 'graph' with 'flowchart' (more resilient in mermaid v11)
          .replace(/^graph\b/m, 'flowchart')
          // 2. Fix labeled directed edges: A -- label text --> B  =>  A -->|label text| B
          .replace(/^(\s*\S+(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?)\s+--\s+([^-|][^-]*?)\s+-->\s+/gm,
            '$1 -->|$2| ')
          // 3. Fix labeled undirected edges: A -- label text -- B  =>  A ---|label text| B
          .replace(/^(\s*\S+(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?)\s+--\s+([^-|][^-]*?)\s+--\s+/gm,
            '$1 ---|$2| ')
          // 4. Sanitize literal newlines inside node labels
          .replace(/(\[[^\]]+\]|\([^)]+\)|\{[^}]+\})/g, (match) => {
            return match.replace(/\n/g, '<br/>');
          })
          // 5. Wrap node labels containing special characters in quotes
          //    Catches: parentheses, braces, #, &, commas, semicolons, colons, pipes, quotes
          //    e.g. A[Origin (0,0)] → A["Origin (0,0)"]
          .replace(/\[([^\]"]+)\]/g, (match, inner) => {
            if (/[(){}#&,;:|'`<>]/.test(inner)) return `["${inner.replace(/"/g, '')}"]`;
            return match;
          })
          // 6. Remove trailing semicolons that break parsing
          .replace(/;\s*$/gm, '')
          // 7. Escape HTML-like angle brackets in labels that aren't Mermaid markup
          .replace(/\["([^"]*)<(?!br\s*\/?>)([^"]*?)>([^"]*?)"\]/g, '["$1‹$2›$3"]');

        const { svg: rendered } = await mermaid.render(renderKey, sanitizedCode);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to render diagram');
          setSvg('');
        }
        // Clean up failed render element if mermaid left one in the DOM
        const failedEl = document.getElementById('d' + renderKey);
        if (failedEl) failedEl.remove();
      }
    })();

    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs font-bold text-red-600 mb-2">Diagram render error</p>
        <pre className="text-xs text-gray-600 bg-white rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <div className="animate-pulse text-xs font-bold uppercase tracking-widest">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container overflow-x-auto bg-white rounded-xl p-4 border border-gray-100"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
