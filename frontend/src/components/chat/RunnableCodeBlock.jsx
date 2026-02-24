import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Check, ChevronDown, ChevronUp, Edit3, Eye, Loader2, Terminal, RotateCcw, Download, Maximize2, Minimize2, Plus, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Shared Pyodide instance across all blocks
let pyodideInstance = null;
let pyodideLoading = false;
const pyodideWaiters = [];

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    return new Promise((resolve, reject) => {
      pyodideWaiters.push({ resolve, reject });
    });
  }
  pyodideLoading = true;
  try {
    if (!window.loadPyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Pyodide CDN'));
      });
    }
    pyodideInstance = await window.loadPyodide();
    await pyodideInstance.loadPackage(['micropip']);
    pyodideWaiters.forEach(w => w.resolve(pyodideInstance));
    return pyodideInstance;
  } catch (err) {
    pyodideWaiters.forEach(w => w.reject(err));
    throw err;
  } finally {
    pyodideLoading = false;
    pyodideWaiters.length = 0;
  }
}

const LANG_LABELS = {
  python: 'Python', py: 'Python',
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  c: 'C', cpp: 'C++', 'c++': 'C++',
  java: 'Java', rust: 'Rust', go: 'Go',
  ruby: 'Ruby', php: 'PHP', swift: 'Swift', kotlin: 'Kotlin',
  json: 'JSON', xml: 'XML', html: 'HTML', css: 'CSS',
  sql: 'SQL', bash: 'Bash', sh: 'Shell',
  r: 'R', matlab: 'MATLAB', lua: 'Lua',
  yaml: 'YAML', toml: 'TOML', markdown: 'Markdown', md: 'Markdown',
  latex: 'LaTeX', tex: 'LaTeX',
};

const RUNNABLE_LANGS = new Set(['python', 'py', 'javascript', 'js', 'typescript', 'ts']);

function normalizeLanguage(lang) {
  if (!lang) return 'text';
  const l = lang.toLowerCase().trim();
  if (l === 'c++') return 'cpp';
  if (l === 'tsx' || l === 'jsx') return 'javascript';
  return l;
}

export default function RunnableCodeBlock({ code: initialCode, language: rawLang, runnable }) {
  const language = normalizeLanguage(rawLang);
  const [files, setFiles] = useState([{ name: 'main', code: initialCode || '', language }]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const textareaRef = useRef(null);
  const outputEndRef = useRef(null);

  const activeFile = files[activeFileIdx];
  const code = activeFile?.code || '';
  const canRun = runnable !== false && RUNNABLE_LANGS.has(language);

  useEffect(() => {
    if (outputEndRef.current) outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const setCode = (newCode) => {
    setFiles(prev => prev.map((f, i) => i === activeFileIdx ? { ...f, code: newCode } : f));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = language === 'python' || language === 'py' ? '.py' :
                language === 'javascript' || language === 'js' ? '.js' :
                language === 'typescript' || language === 'ts' ? '.ts' :
                language === 'html' ? '.html' : language === 'css' ? '.css' :
                language === 'json' ? '.json' : '.txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.name}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addOutputLine = useCallback((text, type = 'log') => {
    setOutput(prev => [...prev, { text, type, time: Date.now() }]);
  }, []);

  const clearOutput = () => setOutput([]);

  const runJavaScript = useCallback(async (codeToRun) => {
    return new Promise((resolve) => {
      const html = `
        <!DOCTYPE html><html><body><script>
          const __logs = [];
          const __fmt = (v) => {
            if (v === undefined) return 'undefined';
            if (v === null) return 'null';
            if (typeof v === 'object') {
              try { return JSON.stringify(v, null, 2); } catch { return String(v); }
            }
            return String(v);
          };
          console.log = (...args) => parent.postMessage({ type: 'log', text: args.map(__fmt).join(' ') }, '*');
          console.warn = (...args) => parent.postMessage({ type: 'warn', text: args.map(__fmt).join(' ') }, '*');
          console.error = (...args) => parent.postMessage({ type: 'error', text: args.map(__fmt).join(' ') }, '*');
          console.table = (data) => parent.postMessage({ type: 'log', text: JSON.stringify(data, null, 2) }, '*');
          console.time = () => {};
          console.timeEnd = () => {};

          try {
            const __result = (function() { ${codeToRun} })();
            if (__result !== undefined) parent.postMessage({ type: 'return', text: __fmt(__result) }, '*');
            parent.postMessage({ type: 'done' }, '*');
          } catch(e) {
            parent.postMessage({ type: 'error', text: e.stack || e.message }, '*');
            parent.postMessage({ type: 'done' }, '*');
          }
        <\/script></body></html>
      `;

      let done = false;
      const handler = (e) => {
        if (!e.data?.type) return;
        if (e.data.type === 'done') {
          done = true;
          window.removeEventListener('message', handler);
          resolve();
          return;
        }
        if (['log', 'warn', 'error', 'return'].includes(e.data.type)) {
          addOutputLine(e.data.text, e.data.type);
        }
      };
      window.addEventListener('message', handler);

      setTimeout(() => {
        if (!done) {
          window.removeEventListener('message', handler);
          addOutputLine('Execution timed out (5s)', 'error');
          resolve();
        }
      }, 5000);

      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts';
      iframe.style.display = 'none';
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
      setTimeout(() => { try { iframe.remove(); } catch {} }, 6000);
    });
  }, [addOutputLine]);

  const runPython = useCallback(async (codeToRun) => {
    try {
      addOutputLine('Loading Python runtime...', 'system');
      const pyodide = await getPyodide();
      setOutput(prev => prev.filter(l => l.text !== 'Loading Python runtime...'));

      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      try {
        await pyodide.runPythonAsync(codeToRun);
      } catch (err) {
        addOutputLine(err.message, 'error');
      }

      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      const stderr = pyodide.runPython('sys.stderr.getvalue()');

      if (stdout) {
        stdout.split('\n').filter(Boolean).forEach(line => addOutputLine(line, 'log'));
      }
      if (stderr) {
        stderr.split('\n').filter(Boolean).forEach(line => addOutputLine(line, 'error'));
      }
      if (!stdout && !stderr) {
        addOutputLine('(no output)', 'system');
      }
    } catch (err) {
      addOutputLine('Failed to load Python: ' + err.message, 'error');
    }
  }, [addOutputLine]);

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setShowOutput(true);
    clearOutput();
    addOutputLine(`$ Running ${LANG_LABELS[language] || language}...`, 'system');

    try {
      const lang = language.toLowerCase();
      if (lang === 'python' || lang === 'py') {
        await runPython(code);
      } else if (lang === 'typescript' || lang === 'ts') {
        // Strip type annotations for execution (basic)
        const stripped = code
          .replace(/:\s*(string|number|boolean|any|void|object|never|unknown)\b/g, '')
          .replace(/<[A-Za-z, ]+>/g, '')
          .replace(/\bas\s+\w+/g, '')
          .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
          .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
        await runJavaScript(stripped);
      } else {
        await runJavaScript(code);
      }
    } catch (err) {
      addOutputLine(err.message, 'error');
    } finally {
      setIsRunning(false);
      addOutputLine('Process exited.', 'system');
    }
  };

  const handleTerminalCommand = (cmd) => {
    if (!cmd.trim()) return;
    addOutputLine(`> ${cmd}`, 'input');
    setTerminalInput('');

    // Simple REPL commands
    if (cmd === 'clear') {
      clearOutput();
      return;
    }
    if (cmd === 'help') {
      addOutputLine('Commands: clear, help, run, reset', 'system');
      addOutputLine('Or type JavaScript/Python expressions to evaluate', 'system');
      return;
    }
    if (cmd === 'run') {
      handleRun();
      return;
    }
    if (cmd === 'reset') {
      clearOutput();
      pyodideInstance = null;
      addOutputLine('Runtime reset.', 'system');
      return;
    }

    // Evaluate expression
    const lang = language.toLowerCase();
    if (lang === 'python' || lang === 'py') {
      runPython(cmd);
    } else {
      runJavaScript(cmd);
    }
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const newCode = code.substring(0, selectionStart) + '  ' + code.substring(selectionEnd);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2;
      }, 0);
    }
  };

  const addFile = () => {
    const name = `file${files.length + 1}`;
    setFiles(prev => [...prev, { name, code: '', language }]);
    setActiveFileIdx(files.length);
    setIsEditing(true);
  };

  const closeFile = (idx) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter((_, i) => i !== idx));
    if (activeFileIdx >= idx && activeFileIdx > 0) {
      setActiveFileIdx(activeFileIdx - 1);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className={`rounded-xl border border-gray-700 overflow-hidden bg-[#1e1e2e] my-3 shadow-lg ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {LANG_LABELS[language] || language}
          </span>
          {canRun && (
            <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-500/20 text-emerald-400 rounded uppercase tracking-wider">
              Runnable
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {canRun && (
            <>
              <button onClick={() => setIsEditing(!isEditing)} className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded" title={isEditing ? 'Preview' : 'Edit'}>
                {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { setShowTerminal(!showTerminal); setShowOutput(true); }} className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded" title="Terminal">
                <Terminal className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button onClick={handleDownload} className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded" title="Download">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleCopy} className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded" title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {canRun && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 ml-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run
            </button>
          )}
        </div>
      </div>

      {/* File Tabs (when editing with multiple files) */}
      {files.length > 1 && (
        <div className="flex items-center bg-[#1e1e2e] border-b border-gray-700/30 overflow-x-auto">
          {files.map((file, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold cursor-pointer border-r border-gray-700/30 transition-colors ${
                idx === activeFileIdx ? 'bg-[#282840] text-gray-200' : 'text-gray-500 hover:text-gray-300 hover:bg-[#252538]'
              }`}
              onClick={() => setActiveFileIdx(idx)}
            >
              <span>{file.name}</span>
              {files.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeFile(idx); }} className="ml-1 hover:text-red-400">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addFile} className="px-2 py-1.5 text-gray-600 hover:text-gray-400 transition-colors" title="New file">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Code Area */}
      <div className={`relative ${isExpanded ? 'flex-1 overflow-auto' : ''}`} style={isExpanded ? { maxHeight: 'calc(100vh - 200px)' } : {}}>
        {isEditing ? (
          <div className="relative flex">
            {/* Line numbers */}
            <div className="flex-shrink-0 pt-4 pb-4 pl-3 pr-2 text-right select-none bg-[#1e1e2e] border-r border-gray-700/30">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="text-[10px] font-mono text-gray-600 leading-[1.6em] h-[1.6em]">{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleTabKey}
              className="w-full bg-transparent text-gray-200 font-mono text-sm p-4 outline-none resize-none leading-[1.6em]"
              spellCheck={false}
              style={{ tabSize: 2, minHeight: Math.max(80, lineCount * 20 + 32) + 'px' }}
            />
          </div>
        ) : (
          <SyntaxHighlighter
            style={oneDark}
            language={language === 'py' ? 'python' : language === 'js' ? 'javascript' : language === 'ts' ? 'typescript' : language === 'c++' ? 'cpp' : language}
            showLineNumbers={true}
            lineNumberStyle={{ color: '#4a4a6a', fontSize: '10px', minWidth: '2em' }}
            customStyle={{
              margin: 0,
              padding: '16px 12px',
              fontSize: '13px',
              background: 'transparent',
              lineHeight: '1.6em',
              maxHeight: isExpanded ? 'none' : '400px',
              overflow: 'auto',
            }}
            wrapLines={true}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>

      {/* Output / Terminal Panel */}
      <AnimatePresence>
        {showOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-gray-700/50">
              {/* Output header */}
              <div className="flex items-center justify-between px-3 py-1 bg-[#181825]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTerminal(false)}
                    className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${!showTerminal ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Output
                  </button>
                  {canRun && (
                    <button
                      onClick={() => setShowTerminal(true)}
                      className={`text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${showTerminal ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <Terminal className="h-3 w-3" /> Terminal
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearOutput} className="p-1 text-gray-500 hover:text-gray-300 transition-colors" title="Clear">
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button onClick={() => setShowOutput(false)} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Output lines */}
              <div className="px-3 py-2 bg-[#11111b] font-mono text-xs max-h-52 overflow-y-auto min-h-[40px]">
                {output.length === 0 && (
                  <span className="text-gray-600 italic">
                    {showTerminal ? 'Type a command below...' : 'Click Run to execute.'}
                  </span>
                )}
                {output.map((line, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap leading-relaxed ${
                      line.type === 'error' ? 'text-red-400' :
                      line.type === 'warn' ? 'text-yellow-400' :
                      line.type === 'system' ? 'text-gray-500 italic' :
                      line.type === 'input' ? 'text-cyan-400' :
                      line.type === 'return' ? 'text-purple-400' :
                      'text-emerald-400'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
                <div ref={outputEndRef} />
              </div>

              {/* Terminal input */}
              {showTerminal && canRun && (
                <div className="flex items-center border-t border-gray-700/30 bg-[#11111b]">
                  <span className="pl-3 text-emerald-500 font-mono text-xs font-bold">{'>'}</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTerminalCommand(terminalInput);
                    }}
                    placeholder={`${LANG_LABELS[language] || 'code'} expression...`}
                    className="flex-1 px-2 py-2 bg-transparent text-gray-200 font-mono text-xs outline-none placeholder:text-gray-600"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded overlay background */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/60 -z-10" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  );
}
