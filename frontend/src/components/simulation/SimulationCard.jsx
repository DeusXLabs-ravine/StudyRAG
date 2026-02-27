import { Rocket, Clock, Activity, Zap } from 'lucide-react';

const ICONS = { Rocket, Clock, Activity, Zap };

const DIFFICULTY_COLORS = {
  beginner: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-600 border-amber-200',
  advanced: 'bg-red-50 text-red-600 border-red-200',
};

export default function SimulationCard({ simulation, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col w-full bg-[#f8f9fa] rounded-2xl border-2 border-[#e9ecef] overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] active:scale-[0.98]"
    >
      {/* Blueprint-style background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Image Container */}
      <div className="relative h-44 overflow-hidden border-b-2 border-[#e9ecef]">
        <img
          src={simulation.image}
          alt={simulation.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-primary/80 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
            Initialize Experiment
          </span>
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm ${DIFFICULTY_COLORS[simulation.difficulty] || DIFFICULTY_COLORS.beginner}`}>
            {simulation.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-2 relative z-10">
        <h3 className="text-base font-black text-gray-900 tracking-tight group-hover:text-primary transition-colors">
          {simulation.title}
        </h3>
        <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
          {simulation.description}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {simulation.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                #{tag}
              </span>
            ))}
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      </div>
    </button>
  );
}
