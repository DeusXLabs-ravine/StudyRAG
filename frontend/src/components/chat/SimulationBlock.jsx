import { useState, useEffect } from 'react';
import { getSimulation } from '../simulation/engines/registry';
import SimulationViewer from '../simulation/SimulationViewer';
import { Activity, Info } from 'lucide-react';

export default function SimulationBlock({ block }) {
  const [engineModule, setEngineModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { simulationId, params: initialParams = {}, suggestedExperiment } = block;

  useEffect(() => {
    const sim = getSimulation(simulationId);
    if (!sim) {
      setError(`Unknown simulation: ${simulationId}`);
      setLoading(false);
      return;
    }

    sim.loadEngine()
      .then(mod => {
        setEngineModule(mod);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load simulation engine.');
        setLoading(false);
      });
  }, [simulationId]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600 font-bold">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse flex flex-col items-center justify-center gap-3">
        <Activity className="h-6 w-6 text-gray-300 animate-pulse" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initializing Laboratory Environment...</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Technical Simulation</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-gray-200/50 text-[8px] font-black text-gray-500 uppercase tracking-tighter">
          v1.0.4-engine
        </div>
      </div>

      <div className="p-5">
        <SimulationViewer engineModule={engineModule} initialParams={initialParams} compact />
      </div>

      {suggestedExperiment && (
        <div className="px-5 pb-5">
          <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Observation Focus</span>
              <p className="text-xs font-medium text-gray-700 leading-relaxed">{suggestedExperiment}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
