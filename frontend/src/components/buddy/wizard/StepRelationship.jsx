const RELATIONSHIPS = [
  {
    value: 'new_friend',
    label: 'New friend',
    blurb: 'Just met. Curious, polite, warming up over time.',
  },
  {
    value: 'close_friend',
    label: 'Close friend',
    blurb: 'Knows you well. Calls you out in a good way.',
  },
  {
    value: 'rival',
    label: 'Friendly rival',
    blurb: 'Races you to the answer. Keeps you competitive.',
  },
  {
    value: 'mentor',
    label: 'Slightly older mentor',
    blurb: 'Been through this before, guides without lecturing.',
  },
];

export default function StepRelationship({ draft, patch }) {
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-gray-600 mb-4">
        This shapes how they talk to you, not what they know.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {RELATIONSHIPS.map(rel => {
          const selected = draft.relationship_mode === rel.value;
          return (
            <button
              key={rel.value}
              type="button"
              onClick={() => patch({ relationship_mode: rel.value })}
              aria-pressed={selected}
              className={[
                'text-left p-4 rounded-xl transition-colors cursor-pointer border',
                selected
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold text-gray-900">{rel.label}</span>
                {selected && <span className="text-[11px] text-amber-700 font-semibold">Selected</span>}
              </div>
              <p className="mt-1 text-[13px] text-gray-600 leading-snug">{rel.blurb}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
