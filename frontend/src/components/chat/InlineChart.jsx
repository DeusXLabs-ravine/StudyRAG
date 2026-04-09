import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// Safe math expression evaluator for plotting
function safeEvalExpr(expr, x) {
  try {
    const sanitized = expr
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
      .replace(/\bceil\b/g, 'Math.ceil')
      .replace(/\bfloor\b/g, 'Math.floor')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\^/g, '**');
    const fn = new Function('x', 'Math', `"use strict"; return (${sanitized});`);
    const result = fn(x, Math);
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// Generate data points from an expression
function generatePlotData(expression, xMin = -10, xMax = 10, points = 200) {
  const step = (xMax - xMin) / points;
  const data = [];
  for (let i = 0; i <= points; i++) {
    const x = xMin + i * step;
    const y = safeEvalExpr(expression, x);
    if (y !== null && Math.abs(y) < 1e6) {
      data.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
    }
  }
  return data;
}

// Parse "plot y=sin(x) from -5 to 5" style expressions
function parseExpression(text) {
  // Try various formats
  const match = text.match(/(?:y\s*=\s*)?(.+?)(?:\s+(?:from|for|x\s*[=:]\s*)\s*([-\d.]+)\s*(?:to|\.\.)\s*([-\d.]+))?$/i);
  if (match) {
    const expr = match[1].trim();
    const xMin = match[2] ? parseFloat(match[2]) : -10;
    const xMax = match[3] ? parseFloat(match[3]) : 10;
    return { expr, xMin, xMax };
  }
  return { expr: text, xMin: -10, xMax: 10 };
}

function FunctionPlotter({ block }) {
  const { expression, expressions, xMin: initXMin, xMax: initXMax, title } = block;
  const [xMin, setXMin] = useState(initXMin ?? -10);
  const [xMax, setXMax] = useState(initXMax ?? 10);

  const exprList = expressions || (expression ? [expression] : []);

  const datasets = useMemo(() => {
    return exprList.map((expr, idx) => {
      const parsed = parseExpression(expr);
      const data = generatePlotData(parsed.expr, xMin, xMax);
      return { data, expr: parsed.expr, color: COLORS[idx % COLORS.length] };
    });
  }, [exprList, xMin, xMax]);

  // Merge all data points into one array with named y columns
  const mergedData = useMemo(() => {
    if (datasets.length === 0) return [];
    const allX = new Set();
    datasets.forEach(ds => ds.data.forEach(d => allX.add(d.x)));
    const sorted = [...allX].sort((a, b) => a - b);
    return sorted.map(x => {
      const point = { x };
      datasets.forEach((ds, idx) => {
        const found = ds.data.find(d => d.x === x);
        point[`y${idx}`] = found?.y ?? null;
      });
      return point;
    });
  }, [datasets]);

  const zoomIn = () => {
    const range = xMax - xMin;
    const center = (xMax + xMin) / 2;
    setXMin(center - range / 4);
    setXMax(center + range / 4);
  };

  const zoomOut = () => {
    const range = xMax - xMin;
    const center = (xMax + xMin) / 2;
    setXMin(center - range);
    setXMax(center + range);
  };

  const reset = () => {
    setXMin(initXMin ?? -10);
    setXMax(initXMax ?? 10);
  };

  if (mergedData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden my-2">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div>
          {title && <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">{title}</h4>}
          <div className="flex flex-wrap gap-2 mt-1">
            {datasets.map((ds, i) => (
              <span key={i} className="text-[10px] font-mono font-bold" style={{ color: ds.color }}>
                y = {ds.expr}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={zoomIn} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded" title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={zoomOut} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded" title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded" title="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="w-full px-2 pb-2" style={{ height: 280, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fontWeight: 600 }} type="number" domain={[xMin, xMax]} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 600 }}
              formatter={(value, name) => [value, datasets[parseInt(name.replace('y', ''))]?.expr || name]}
            />
            {datasets.map((ds, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`y${i}`}
                stroke={ds.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name={`y${i}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-2 flex items-center gap-2 text-[9px] text-gray-400">
        <TrendingUp className="h-3 w-3" />
        <span>x: [{xMin.toFixed(1)}, {xMax.toFixed(1)}] • {mergedData.length} points</span>
      </div>
    </div>
  );
}

export default function InlineChart({ block }) {
  const { chartType, data, xKey, yKey, title, series, expression, expressions } = block;

  // If block has expression(s), use the function plotter
  if (expression || expressions) {
    return <FunctionPlotter block={block} />;
  }

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data;
  }, [data]);

  if (chartData.length === 0) return null;

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey || 'x'} tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }} />
            {series && series.length > 0 ? (
              series.map((s, idx) => (
                <Bar key={s} dataKey={s} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))
            ) : (
              <Bar dataKey={yKey || 'y'} fill="#6366f1" radius={[4, 4, 0, 0]} />
            )}
            <Legend />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={yKey || 'value'}
              nameKey={xKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 600 }} />
            <Legend />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey || 'x'} tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }} />
            <Area type="monotone" dataKey={yKey || 'y'} stroke="#6366f1" fillOpacity={1} fill="url(#colorArea)" />
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey || 'x'} tick={{ fontSize: 11 }} />
            <YAxis dataKey={yKey || 'y'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 600 }} />
            <Scatter data={chartData} fill="#6366f1" />
          </ScatterChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey || 'x'} tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600 }} />
            {series && series.length > 0 ? (
              series.map((s, idx) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))
            ) : (
              <Line type="monotone" dataKey={yKey || 'y'} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            )}
            <Legend />
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 my-2">
      {title && (
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">{title}</h4>
      )}
      <div className="w-full" style={{ height: 250, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
