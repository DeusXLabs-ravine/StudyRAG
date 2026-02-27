import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0ea5e9', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function SimulationGraphPanel({ graphData, seriesConfig = [] }) {
  const [activeSeries, setActiveSeries] = useState(() =>
    seriesConfig.map(s => s.key)
  );

  const toggleSeries = (key) => {
    setActiveSeries(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  if (!seriesConfig.length) return null;

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      {/* Series toggle pills */}
      <div className="flex flex-wrap gap-1 mb-2">
        {seriesConfig.map((s, i) => {
          const active = activeSeries.includes(s.key);
          const color = COLORS[i % COLORS.length];
          return (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${active
                ? 'text-white shadow-sm'
                : 'bg-gray-50 text-gray-400 border-gray-200'}`}
              style={active ? { backgroundColor: color, borderColor: color } : {}}
            >
              {s.label}{s.unit ? ` (${s.unit})` : ''}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 w-full pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={graphData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8' } }}
            />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 600 }}
              formatter={(value, name) => {
                const series = seriesConfig.find(s => s.key === name);
                return [typeof value === 'number' ? value.toFixed(2) : value, series?.label || name];
              }}
            />
            {seriesConfig.map((s, i) =>
              activeSeries.includes(s.key) && (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
