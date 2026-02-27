import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Atom, Beaker, Cpu, Flame, Box, LayoutGrid } from 'lucide-react';
import SimulationCard from '../components/simulation/SimulationCard';
import SimulationViewer from '../components/simulation/SimulationViewer';
import PhysicsLab3D from '../components/simulation/PhysicsLab3D';
import { getAllSimulations, getSimulation, CATEGORIES } from '../components/simulation/engines/registry';

const LAB_SECTIONS = [
  {
    id: 'physics',
    title: 'Physics Lab',
    description: 'Mechanics, waves, electromagnetism, and thermodynamics simulations.',
    icon: Atom,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    available: true,
  },
  {
    id: 'chemistry',
    title: 'Chemistry Lab',
    description: 'Molecular structures, reactions, and equilibrium visualizations.',
    icon: Beaker,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    available: false,
  },
  {
    id: 'engineering',
    title: 'Engineering Lab',
    description: 'Circuit design, signal processing, and control systems.',
    icon: Cpu,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    available: false,
  },
  {
    id: 'thermodynamics',
    title: 'Thermo Lab',
    description: 'Heat engines, entropy, and phase diagrams.',
    icon: Flame,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    available: false,
  },
];

export default function Simulations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const simId = searchParams.get('sim');
  const labSection = searchParams.get('lab');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [engineModule, setEngineModule] = useState(null);
  const [loadingEngine, setLoadingEngine] = useState(false);
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'

  useEffect(() => {
    if (!simId) {
      setEngineModule(null);
      return;
    }
    const sim = getSimulation(simId);
    if (!sim) return;

    setLoadingEngine(true);
    sim.loadEngine().then(mod => {
      setEngineModule(mod);
      setLoadingEngine(false);
    }).catch(() => setLoadingEngine(false));
  }, [simId]);

  const allSims = useMemo(() => getAllSimulations(), []);

  const filtered = useMemo(() => {
    let list = allSims;
    if (category !== 'all') list = list.filter(s => s.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allSims, category, search]);

  const simInfo = simId ? getSimulation(simId) : null;

  const initialParams = useMemo(() => {
    const p = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'sim' && key !== 'lab') {
        const num = parseFloat(value);
        p[key] = isNaN(num) ? value : num;
      }
    }
    return p;
  }, [searchParams]);

  // Simulation viewer mode
  if (simId) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
        <div className="flex items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchParams({ lab: 'physics' })}
              className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary hover:border-primary/20 transition-all group shadow-sm"
              title="Back to Wing"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Module</span>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">{simInfo?.title}</h1>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              <span className="text-[9px] font-bold text-green-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE STREAMING
              </span>
            </div>
          </div>
        </div>

        {loadingEngine ? (
          <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-3xl border-2 border-gray-50 shadow-inner">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Initializing Core...</div>
          </div>
        ) : (
          <SimulationViewer engineModule={engineModule} initialParams={initialParams} />
        )}
      </div>
    );
  }

  // Physics lab catalog
  if (labSection === 'physics') {
    return (
      <div className="min-h-screen bg-[#f1f3f5] pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setSearchParams({})}
              className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-primary transition-all uppercase tracking-widest group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Return to Laboratory Entry
            </button>

            <div className="flex items-center bg-gray-200/50 p-1 rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === '3d' ? 'bg-white text-primary shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Box className="h-3.5 w-3.5" /> 3D View
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === '2d' ? 'bg-white text-primary shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Classic
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-2 border-gray-200 pb-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Atom className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Physics Experimental Wing</h1>
              </div>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Advanced computational models for mechanics and thermodynamics.
                Select a module below to initialize the experimental apparatus and begin data acquisition.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter Modules..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl border border-gray-200">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${category === c.key
                      ? 'bg-white text-primary shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === '3d' && !search.trim() && category === 'all' ? (
              <motion.div
                key="3d-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: "circOut" }}
              >
                <PhysicsLab3D simulations={allSims} onSelect={(id) => setSearchParams({ sim: id })} />
              </motion.div>
            ) : (
              <motion.div
                key="2d-view"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border-2 border-white pointer-events-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]" />

                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-4">
                  {filtered.map((sim, i) => (
                    <motion.div
                      key={sim.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                        delay: i * 0.1
                      }}
                      className="perspective-1000"
                    >
                      <SimulationCard
                        simulation={sim}
                        onClick={() => setSearchParams({ sim: sim.id })}
                      />
                    </motion.div>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="relative text-center py-24 bg-white/50 rounded-3xl border-2 border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">No matching experimental modules found</h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">Adjust your search parameters or select a different department.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lab Notes / Industrial details at bottom */}
          <div className="mt-16 flex items-center justify-center gap-12 border-t border-gray-200 pt-12">
            <div className="flex flex-col items-center gap-1 opacity-40">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Facility Status</span>
              <span className="text-[9px] font-bold text-green-600 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> OPERATIONAL
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Engine Version</span>
              <span className="text-[9px] font-mono font-bold text-gray-600">v4.0.2-BETA</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Sync Latency</span>
              <span className="text-[9px] font-mono font-bold text-gray-600">0.04ms</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lab landing page
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Experimental Lab</h1>
        <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
          Welcome to the institutional experimental simulations platform.
          Please select a department to begin your hands-on research.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {LAB_SECTIONS.map((lab, i) => {
          const Icon = lab.icon;
          return (
            <motion.button
              key={lab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => lab.available && setSearchParams({ lab: lab.id })}
              disabled={!lab.available}
              className={`text-left w-full bg-white rounded-2xl border-2 p-8 transition-all relative overflow-hidden group ${lab.available
                ? 'border-gray-100 hover:border-primary/20 hover:shadow-xl cursor-pointer active:scale-[0.99]'
                : 'border-gray-50 opacity-50 cursor-not-allowed'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start gap-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm transition-transform group-hover:scale-110 ${lab.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors">{lab.title}</h3>
                    {!lab.available && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-400 uppercase tracking-wider">Restricted Access</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1.5 leading-relaxed">{lab.description}</p>
                  {lab.available && (
                    <p className="text-[10px] font-black text-primary mt-4 uppercase tracking-[0.2em] flex items-center gap-2">
                      ENTER FACILITY <span className="w-8 h-px bg-primary/30 group-hover:w-12 transition-all" />
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
