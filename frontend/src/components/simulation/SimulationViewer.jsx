import { useState, useMemo, useCallback } from 'react';
import { Activity, Zap } from 'lucide-react';
import useSimulationEngine from './engines/useSimulationEngine';
import SimulationCanvas from './SimulationCanvas';
import SimulationControls from './SimulationControls';
import SimulationGraphPanel from './SimulationGraphPanel';
import SimulationFormulaPanel from './SimulationFormulaPanel';

export default function SimulationViewer({ engineModule, initialParams, compact = false }) {
  const paramSchema = engineModule?.PARAMS || [];
  const seriesConfig = engineModule?.GRAPH_SERIES || [];

  const [params, setParams] = useState(() => {
    const defaults = {};
    paramSchema.forEach(p => { defaults[p.key] = p.default; });
    return { ...defaults, ...initialParams };
  });

  const frozenParams = useMemo(() => ({ ...params }), [JSON.stringify(params)]);

  const engineFn = engineModule?.default || null;

  const {
    isRunning, time, graphData, formulas,
    speed, setSpeed,
    play, pause, reset, stepOnce, draw,
  } = useSimulationEngine(engineFn, frozenParams);

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  if (!engineModule) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm font-medium">
        No simulation engine loaded.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-[280px]">
          <SimulationCanvas draw={draw} />
        </div>
        <SimulationControls
          params={params}
          paramSchema={paramSchema}
          onParamChange={handleParamChange}
          isRunning={isRunning}
          onPlay={play}
          onPause={pause}
          onReset={reset}
          onStep={stepOnce}
          speed={speed}
          onSpeedChange={setSpeed}
          time={time}
        />
        <SimulationGraphPanel graphData={graphData} seriesConfig={seriesConfig} />
        <SimulationFormulaPanel formulas={formulas} />
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-4 xl:gap-4 items-start w-full">
      {/* Column 1: Control Matrix (25%) */}
      <div className="w-full xl:col-span-1 flex flex-col gap-3 min-w-0">
        <div className="bg-white rounded-[1.2rem] border-2 border-gray-100 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-900">Control Matrix</h4>
          </div>
          <SimulationControls
            params={params}
            paramSchema={paramSchema}
            onParamChange={handleParamChange}
            isRunning={isRunning}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onStep={stepOnce}
            speed={speed}
            onSpeedChange={setSpeed}
            time={time}
          />
        </div>
      </div>

      {/* Column 2: Labs Stage & Analytics (50%) */}
      <div className="xl:col-span-2 w-full flex flex-col gap-4 min-w-0">
        {/* Physics Stage */}
        <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 p-1 shadow-sm relative overflow-hidden h-[340px] lg:h-[380px]">
          <div className="absolute top-4 left-4 flex gap-1.5 z-10 opacity-30">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <SimulationCanvas draw={draw} className="bg-[#fcfcfc]" />
        </div>

        {/* Live Telemetry */}
        <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 p-3 shadow-sm h-[180px] lg:h-[200px] flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-900">Live Telemetry</h4>
          </div>
          <div className="flex-1 min-h-0">
            <SimulationGraphPanel graphData={graphData} seriesConfig={seriesConfig} />
          </div>
        </div>
      </div>

      {/* Column 3: Theoretical Constants (25%) */}
      <div className="w-full xl:col-span-1 flex flex-col gap-3 min-w-0">
        <div className="bg-white rounded-[1.2rem] border-2 border-gray-100 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3 w-3 text-blue-500" />
            <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-900">Formulas</h4>
          </div>
          <SimulationFormulaPanel formulas={formulas} />
        </div>
      </div>
    </div>
  );
}

