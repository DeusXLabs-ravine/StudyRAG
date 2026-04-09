import { useNavigate } from 'react-router-dom';
import { X, Sparkles, GraduationCap, Gamepad2, FlaskConical, Lock, Radio } from 'lucide-react';

const FEATURE_META = {
  teach:       { icon: GraduationCap, label: 'Teach Mode',        desc: 'Live audio sessions with your AI tutor, Sage.',                                tier: 'Pro' },
  games:       { icon: Gamepad2,      label: 'In-Chat Games',     desc: 'Quiz games, speed rounds, and matching challenges.',                            tier: 'Pro' },
  simulations: { icon: FlaskConical,  label: 'Physics Lab',       desc: 'Interactive simulations and 3D science experiments.',                           tier: 'Pro' },
  documents:   { icon: Lock,          label: 'More Documents',    desc: 'Upload more study materials to your library.',                                   tier: 'Basic' },
  podcast:     { icon: Radio,         label: 'Study Break Podcast', desc: 'Two AI hosts discuss your module using analogies tailored to your interests.', tier: 'Max' },
};

export default function UpgradeModal({ feature, onClose }) {
  const navigate = useNavigate();
  const meta = FEATURE_META[feature] || { icon: Sparkles, label: 'Premium Feature', desc: 'Upgrade to unlock this feature.', tier: 'Pro' };
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          <Sparkles className="h-3 w-3" />
          {meta.tier} Feature
        </div>

        <h2 className="text-xl font-black text-gray-900 mb-2">{meta.label}</h2>
        <p className="text-sm text-gray-500 mb-6">{meta.desc}</p>

        <button
          onClick={() => { onClose(); navigate('/pricing'); }}
          className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:bg-primary/90 transition-colors mb-2"
        >
          Upgrade to {meta.tier}
        </button>
        <button
          onClick={onClose}
          className="w-full text-gray-500 text-sm font-medium py-2 hover:text-gray-700 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
