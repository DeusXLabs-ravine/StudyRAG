const DIMENSIONS = [
  {
    key: 'energy',
    label: 'Energy',
    hint: 'Chill and unhurried, or alert and animated?',
    options: [
      { value: 'low',    label: 'Chill' },
      { value: 'medium', label: 'Balanced' },
      { value: 'high',   label: 'Animated' },
    ],
  },
  {
    key: 'humor',
    label: 'Humor',
    hint: 'Do they crack jokes, or keep it straight?',
    options: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'dry',     label: 'Dry' },
      { value: 'witty',   label: 'Witty' },
      { value: 'goofy',   label: 'Goofy' },
    ],
  },
  {
    key: 'formality',
    label: 'Formality',
    hint: 'Text-voice casual, or a bit more buttoned up?',
    options: [
      { value: 'casual',   label: 'Casual' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'formal',   label: 'Formal' },
    ],
  },
  {
    key: 'confidence',
    label: 'Confidence',
    hint: 'Hedges a lot, or swings first and course-corrects?',
    options: [
      { value: 'humble',    label: 'Humble' },
      { value: 'balanced',  label: 'Balanced' },
      { value: 'assertive', label: 'Assertive' },
    ],
  },
];

export default function StepPersonality({ draft, patch }) {
  const setDim = (key, value) => {
    patch({ personality: { ...draft.personality, [key]: value } });
  };

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-gray-600">
        Four quick dials. Shift each however feels right. Nothing locks you in.
      </p>
      {DIMENSIONS.map(dim => (
        <div key={dim.key}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[14px] font-medium text-gray-900">{dim.label}</span>
            <span className="text-[12px] text-gray-500">{dim.hint}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dim.options.map(opt => {
              const selected = draft.personality[dim.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDim(dim.key, opt.value)}
                  aria-pressed={selected}
                  className={[
                    'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border',
                    selected
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
