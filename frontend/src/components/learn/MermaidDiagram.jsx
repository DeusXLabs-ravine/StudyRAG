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
        const { svg: rendered } = await mermaid.render(renderKey, code);
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
