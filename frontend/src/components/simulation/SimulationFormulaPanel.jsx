import { useEffect, useRef } from 'react';
import katex from 'katex';

function FormulaRow({ formula, active }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(formula.latex, ref.current, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      ref.current.textContent = formula.latex;
    }
  }, [formula.latex]);

  return (
    <div className={`flex flex-col gap-0.5 p-2 rounded-xl border transition-all ${active
      ? 'bg-blue-50 border-blue-200 shadow-sm'
      : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{formula.label}</span>
        {formula.value !== undefined && (
          <span className="text-[10px] font-bold text-blue-700 tabular-nums">
            {typeof formula.value === 'number' ? formula.value.toFixed(3) : formula.value}
          </span>
        )}
      </div>
      <div ref={ref} className="text-xs overflow-x-auto" />
    </div>
  );
}

export default function SimulationFormulaPanel({ formulas = [] }) {
  if (!formulas.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Formulas</h4>
      <div className="space-y-2">
        {formulas.map((f, i) => (
          <FormulaRow key={f.label || i} formula={f} active={f.active} />
        ))}
      </div>
    </div>
  );
}
