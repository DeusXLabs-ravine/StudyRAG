import useBuddyStore from '../../../store/buddyStore';
import { Sparkles } from 'lucide-react';

export default function StepPreset({ draft, patch }) {
  const presets = useBuddyStore(s => s.presets);

  const applyPreset = (preset) => {
    patch({
      presetKey: preset.key,
      name: preset.name,
      pronouns: preset.pronouns,
      voice_id: preset.voice_id,
      personality: preset.personality || draft.personality,
      relationship_mode: preset.relationship_mode,
    });
  };

  const startBlank = () => {
    patch({ presetKey: null });
  };

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-gray-600 mb-4">
        Pick a personality that feels close, or start blank and build your own.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {presets.map(p => {
          const selected = draft.presetKey === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              aria-pressed={selected}
              className={[
                'text-left p-4 rounded-xl transition-colors cursor-pointer border',
                selected
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold text-gray-900">{p.name}</span>
                <span className="text-[11px] uppercase tracking-wider text-gray-500">{p.pronouns}</span>
              </div>
              <p className="mt-1 text-[13px] text-gray-600">{p.descriptor}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(p.personality || {}).slice(0, 3).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                    {k}: {v}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={startBlank}
        aria-pressed={draft.presetKey === null}
        className={[
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors cursor-pointer border',
          draft.presetKey === null
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
        ].join(' ')}
      >
        <Sparkles className="w-4 h-4" />
        Start from scratch
      </button>
    </div>
  );
}
