import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function LockedPage({ icon: Icon, title, description, tier = 'Pro' }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
          <Icon className="h-10 w-10 text-primary" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
          <Sparkles className="h-3 w-3" />
          {tier} Feature
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-500 mb-8">{description}</p>

        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to {tier}
        </button>
      </div>
    </div>
  );
}
