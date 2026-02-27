import { Play, Pause, RotateCcw, StepForward, Settings2 } from 'lucide-react';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2];

export default function SimulationControls({
  params,
  paramSchema,
  onParamChange,
  isRunning,
  onPlay,
  onPause,
  onReset,
  onStep,
  speed,
  onSpeedChange,
  time,
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Simulation Master Interface - Ultra Compact */}
      <div className="flex items-center gap-3 flex-wrap pb-4 border-b border-gray-100">
        <div className="flex items-center bg-[#212529] p-1 rounded-xl shadow-md">
          {isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#e03131] text-white rounded-lg text-[9px] font-black hover:bg-[#c92a2a] transition-all uppercase tracking-wider active:scale-95"
            >
              <Pause className="h-3.5 w-3.5 fill-current" /> STOP
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[9px] font-black hover:bg-primary/90 transition-all uppercase tracking-wider active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> START
            </button>
          )}

          <div className="flex items-center gap-0.5 mx-1">
            <button onClick={onReset} className="p-2 text-gray-500 hover:text-white transition-colors" title="Reset">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={onStep} disabled={isRunning} className="p-2 text-gray-500 hover:text-white transition-colors disabled:opacity-20" title="Step">
              <StepForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Temporal Compression */}
        <div className="flex flex-col gap-1">
          <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest leading-none">Warp</span>
          <div className="flex gap-0.5 bg-gray-50 p-0.5 rounded-lg border border-gray-100 shadow-inner">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${speed === s
                  ? 'bg-white text-primary shadow-sm border border-gray-200/50'
                  : 'text-gray-400 hover:text-gray-600'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Compact Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary/20 bg-gradient-to-b from-primary to-primary/40 rounded-full" />
          <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Parameters</h4>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[7px] font-black text-gray-300 uppercase">Clock</span>
          <span className="text-[11px] font-black font-mono text-primary tabular-nums tracking-tighter">
            {time.toFixed(3)}s
          </span>
        </div>
      </div>

      {/* Parameter Control Matrix */}
      <div className="grid grid-cols-1 gap-y-4">
        {paramSchema.map(p => {
          if (p.type === 'toggle') {
            return (
              <label key={p.key} className="flex items-center justify-between gap-4 py-0.5 border-b border-gray-50 pb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">{p.label}</span>
                  <span className="text-[8px] font-medium text-gray-400">System State</span>
                </div>
                <button
                  onClick={() => onParamChange(p.key, !params[p.key])}
                  className={`w-10 h-5 rounded-full transition-all duration-300 relative border-2 ${params[p.key] ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-gray-200 border-gray-300 shadow-inner'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white shadow-md absolute top-0.5 transition-transform duration-300 ${params[p.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            );
          }
          if (p.type === 'select') {
            return (
              <label key={p.key} className="flex flex-col gap-1.5 border-b border-gray-50 pb-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.label}</span>
                <div className="relative group">
                  <select
                    value={params[p.key]}
                    onChange={e => onParamChange(p.key, e.target.value)}
                    className="w-full appearance-none text-[10px] bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 font-black text-gray-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    {p.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
                    <Settings2 className="h-3 w-3" />
                  </div>
                </div>
              </label>
            );
          }
          // Default: Precision Slider
          return (
            <label key={p.key} className="flex flex-col gap-1.5 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.label}</span>
                <div className="flex items-baseline gap-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md shadow-sm">
                  <span className="text-[10px] font-black font-mono text-gray-900 tabular-nums">
                    {typeof params[p.key] === 'number' ? params[p.key].toFixed(p.step < 1 ? 2 : p.step < 0.1 ? 3 : 1) : params[p.key]}
                  </span>
                  {p.unit && <span className="text-[7px] font-black text-primary/60 uppercase">{p.unit}</span>}
                </div>
              </div>
              <div className="relative flex items-center h-4">
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={params[p.key]}
                  onChange={e => onParamChange(p.key, parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
