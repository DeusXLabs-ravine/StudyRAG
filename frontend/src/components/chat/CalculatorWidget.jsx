import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, Clock, Trash2, TrendingUp, Variable, Ruler } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import katex from 'katex';

// Safe math evaluator with variable support
function safeEvaluate(expr, variables = {}) {
  try {
    let sanitized = expr
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\basin\b/g, 'Math.asin')
      .replace(/\bacos\b/g, 'Math.acos')
      .replace(/\batan\b/g, 'Math.atan')
      .replace(/\batan2\b/g, 'Math.atan2')
      .replace(/\blog\b/g, 'Math.log10')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bcbrt\b/g, 'Math.cbrt')
      .replace(/\bceil\b/g, 'Math.ceil')
      .replace(/\bfloor\b/g, 'Math.floor')
      .replace(/\bround\b/g, 'Math.round')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\bmax\b/g, 'Math.max')
      .replace(/\bmin\b/g, 'Math.min')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\^/g, '**')
      .replace(/(\d)(\()/g, '$1*$2')   // 2(3) → 2*(3)
      .replace(/\)(\d)/g, ')*$1')     // (3)2 → (3)*2
      .replace(/\)(\()/g, ')*(');      // (3)(4) → (3)*(4)

    // Replace stored variables
    for (const [name, val] of Object.entries(variables)) {
      sanitized = sanitized.replace(new RegExp(`\\b${name}\\b`, 'g'), `(${val})`);
    }

    const fn = new Function('Math', `"use strict"; return (${sanitized});`);
    const result = fn(Math);

    if (typeof result !== 'number' || !isFinite(result)) {
      return { error: 'Invalid result' };
    }
    return { value: result };
  } catch (err) {
    return { error: err.message };
  }
}

// Unit conversion tables
const UNIT_CONVERSIONS = {
  // Length
  'm_to_ft': 3.28084, 'ft_to_m': 0.3048,
  'km_to_mi': 0.621371, 'mi_to_km': 1.60934,
  'cm_to_in': 0.393701, 'in_to_cm': 2.54,
  'm_to_cm': 100, 'cm_to_m': 0.01,
  // Weight
  'kg_to_lb': 2.20462, 'lb_to_kg': 0.453592,
  'g_to_oz': 0.035274, 'oz_to_g': 28.3495,
  // Temperature handled separately
  // Speed
  'kph_to_mph': 0.621371, 'mph_to_kph': 1.60934,
  // Volume
  'l_to_gal': 0.264172, 'gal_to_l': 3.78541,
  'ml_to_oz': 0.033814, 'oz_to_ml': 29.5735,
  // Energy
  'j_to_cal': 0.239006, 'cal_to_j': 4.184,
  'kj_to_kcal': 0.239006, 'kcal_to_kj': 4.184,
};

function convertUnit(value, from, to) {
  const key = `${from.toLowerCase()}_to_${to.toLowerCase()}`;
  if (key === 'c_to_f') return value * 9 / 5 + 32;
  if (key === 'f_to_c') return (value - 32) * 5 / 9;
  if (key === 'c_to_k') return value + 273.15;
  if (key === 'k_to_c') return value - 273.15;
  const factor = UNIT_CONVERSIONS[key];
  if (factor) return value * factor;
  return null;
}

function renderLatex(expr) {
  try {
    let tex = expr
      .replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/\bpi\b/gi, '\\pi')
      .replace(/\*\*/g, '^')
      .replace(/\*/g, '\\cdot ');
    return katex.renderToString(tex, { throwOnError: false });
  } catch {
    return expr;
  }
}

// Generate plot data for the graphing mode
function generatePlotData(expr, xMin = -10, xMax = 10, variables = {}) {
  const points = 150;
  const step = (xMax - xMin) / points;
  const data = [];
  for (let i = 0; i <= points; i++) {
    const x = xMin + i * step;
    const result = safeEvaluate(expr.replace(/\bx\b/g, `(${x})`), variables);
    if (!result.error && Math.abs(result.value) < 1e6) {
      data.push({ x: Math.round(x * 100) / 100, y: Math.round(result.value * 1000) / 1000 });
    }
  }
  return data;
}

const TABS = ['calc', 'graph', 'units'];
const TAB_ICONS = { calc: Calculator, graph: TrendingUp, units: Ruler };

export default function CalculatorWidget() {
  const [activeTab, setActiveTab] = useState('calc');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [variables, setVariables] = useState({});

  // Graph state
  const [graphExpr, setGraphExpr] = useState('sin(x)');
  const [graphXMin, setGraphXMin] = useState(-10);
  const [graphXMax, setGraphXMax] = useState(10);

  // Unit conversion state
  const [unitValue, setUnitValue] = useState('');
  const [unitFrom, setUnitFrom] = useState('m');
  const [unitTo, setUnitTo] = useState('ft');
  const [unitResult, setUnitResult] = useState(null);

  const graphData = useMemo(() => {
    if (!graphExpr.trim()) return [];
    return generatePlotData(graphExpr, graphXMin, graphXMax, variables);
  }, [graphExpr, graphXMin, graphXMax, variables]);

  const handleEvaluate = useCallback(() => {
    if (!expression.trim()) return;

    // Check for variable assignment (e.g., "a = 5")
    const assignMatch = expression.match(/^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch) {
      const [, varName, varExpr] = assignMatch;
      const evalResult = safeEvaluate(varExpr, variables);
      if (evalResult.error) {
        setError(evalResult.error);
        return;
      }
      setVariables(v => ({ ...v, [varName]: evalResult.value }));
      setResult(evalResult.value);
      setError(null);
      setHistory(h => [{ expr: expression, result: evalResult.value }, ...h].slice(0, 30));
      return;
    }

    const evalResult = safeEvaluate(expression, variables);
    if (evalResult.error) {
      setError(evalResult.error);
      setResult(null);
    } else {
      const rounded = Math.round(evalResult.value * 1e10) / 1e10;
      setResult(rounded);
      setError(null);
      setHistory(h => [{ expr: expression, result: rounded }, ...h].slice(0, 30));
    }
  }, [expression, variables]);

  const handleConvert = () => {
    const val = parseFloat(unitValue);
    if (isNaN(val)) return;
    const converted = convertUnit(val, unitFrom, unitTo);
    setUnitResult(converted !== null ? Math.round(converted * 1e6) / 1e6 : null);
  };

  const quickButtons = [
    { label: 'sin', insert: 'sin(' }, { label: 'cos', insert: 'cos(' },
    { label: 'tan', insert: 'tan(' }, { label: 'log', insert: 'log(' },
    { label: 'ln', insert: 'ln(' }, { label: '√', insert: 'sqrt(' },
    { label: 'π', insert: 'pi' }, { label: 'e', insert: 'e' },
    { label: '^', insert: '^' }, { label: '|x|', insert: 'abs(' },
    { label: 'exp', insert: 'exp(' }, { label: 'cbrt', insert: 'cbrt(' },
    { label: '(', insert: '(' }, { label: ')', insert: ')' },
    { label: '%', insert: '%' }, { label: '!', insert: '' }, // factorial placeholder
  ];

  const unitPairs = [
    { label: 'm ↔ ft', from: 'm', to: 'ft' },
    { label: 'km ↔ mi', from: 'km', to: 'mi' },
    { label: 'kg ↔ lb', from: 'kg', to: 'lb' },
    { label: '°C ↔ °F', from: 'c', to: 'f' },
    { label: '°C ↔ K', from: 'c', to: 'k' },
    { label: 'L ↔ gal', from: 'l', to: 'gal' },
    { label: 'cm ↔ in', from: 'cm', to: 'in' },
    { label: 'kJ ↔ kcal', from: 'kj', to: 'kcal' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden my-2 shadow-sm">
      {/* Header with tabs */}
      <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Calculator</span>
          </div>
          <div className="flex items-center gap-0.5 bg-white/50 rounded-lg p-0.5">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                    activeTab === tab ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* ── Calculator Tab ── */}
        {activeTab === 'calc' && (
          <>
            {/* LaTeX preview */}
            {expression && (
              <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg text-center min-h-[32px]" dangerouslySetInnerHTML={{ __html: renderLatex(expression) }} />
            )}

            {/* Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={expression}
                onChange={e => { setExpression(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') handleEvaluate(); }}
                placeholder="e.g. sin(pi/4) + sqrt(2) or a = 5"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleEvaluate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors">
                =
              </motion.button>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1 mb-3">
              {quickButtons.map(btn => (
                <button key={btn.label} onClick={() => btn.insert && setExpression(e => e + btn.insert)} className="px-2 py-1 bg-gray-100 hover:bg-indigo-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:text-indigo-600 transition-colors">
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Stored variables */}
            {Object.keys(variables).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Variable className="h-3 w-3 text-purple-400 mt-0.5" />
                {Object.entries(variables).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-mono font-bold">
                    {k} = {v}
                    <button onClick={() => setVariables(prev => { const n = { ...prev }; delete n[k]; return n; })} className="ml-1 text-purple-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Result */}
            {result !== null && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
                <span className="text-xs font-bold text-emerald-600 mr-2">Result:</span>
                <span className="text-lg font-black text-emerald-800">{result}</span>
              </motion.div>
            )}
            {error && (
              <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl mb-3">
                <span className="text-xs font-bold text-red-600">{error}</span>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                  <Clock className="h-3 w-3" /> History ({history.length})
                  {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {history.map((h, i) => (
                        <button key={i} onClick={() => { setExpression(h.expr); setResult(h.result); }} className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded text-xs font-mono text-gray-600 transition-colors">
                          <span className="truncate">{h.expr}</span>
                          <span className="font-bold text-gray-900 ml-2">= {h.result}</span>
                        </button>
                      ))}
                      <button onClick={() => setHistory([])} className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-600 px-2 py-1">
                        <Trash2 className="h-2.5 w-2.5" /> Clear
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ── Graph Tab ── */}
        {activeTab === 'graph' && (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">y =</label>
                <input
                  type="text"
                  value={graphExpr}
                  onChange={e => setGraphExpr(e.target.value)}
                  placeholder="sin(x)"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div className="w-16">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">x min</label>
                <input type="number" value={graphXMin} onChange={e => setGraphXMin(parseFloat(e.target.value) || -10)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono outline-none" />
              </div>
              <div className="w-16">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">x max</label>
                <input type="number" value={graphXMax} onChange={e => setGraphXMax(parseFloat(e.target.value) || 10)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono outline-none" />
              </div>
            </div>

            {graphData.length > 0 ? (
              <div className="w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="x" tick={{ fontSize: 9 }} type="number" domain={[graphXMin, graphXMax]} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 600 }} />
                    <Line type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">Enter a function of x to plot</div>
            )}
          </>
        )}

        {/* ── Units Tab ── */}
        {activeTab === 'units' && (
          <>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={unitValue}
                onChange={e => setUnitValue(e.target.value)}
                placeholder="Value"
                className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <input
                type="text"
                value={unitFrom}
                onChange={e => setUnitFrom(e.target.value)}
                placeholder="from"
                className="w-16 px-2 py-2 border border-gray-200 rounded-xl text-sm font-mono text-center outline-none"
              />
              <span className="flex items-center text-gray-400 font-bold">→</span>
              <input
                type="text"
                value={unitTo}
                onChange={e => setUnitTo(e.target.value)}
                placeholder="to"
                className="w-16 px-2 py-2 border border-gray-200 rounded-xl text-sm font-mono text-center outline-none"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleConvert} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">
                Convert
              </motion.button>
            </div>

            {unitResult !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
                <span className="text-lg font-black text-emerald-800">{unitValue} {unitFrom} = {unitResult} {unitTo}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {unitPairs.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setUnitFrom(p.from); setUnitTo(p.to); }}
                  className="px-2 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
