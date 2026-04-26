const PRESETS = [
  {
    key: 'feynman',
    title: 'Make me explain it',
    body: "I learn by teaching. When I try to explain, push back on the parts I fudge and ask follow-ups.",
  },
  {
    key: 'socratic',
    title: 'Ask me questions',
    body: "Don't lecture. Ask me things. If I'm stuck, drop a tiny hint and let me find it.",
  },
  {
    key: 'analogies',
    title: 'Speak in analogies',
    body: "When a concept is abstract, relate it to something from my interests. Keep explanations concrete.",
  },
  {
    key: 'quiet',
    title: 'Quiet company',
    body: "I'll be reading mostly. Stay quiet until I ping you, then answer short and stay low-key.",
  },
];

export default function StepStudyStyle({ draft, patch }) {
  const applyPreset = (p) => patch({ study_style: p.body });

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-gray-600">
        Tell them how you learn best. Pick a template or write your own.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PRESETS.map(p => {
          const selected = draft.study_style === p.body;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              aria-pressed={selected}
              className={[
                'text-left p-3.5 rounded-xl transition-colors cursor-pointer border',
                selected
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="text-[14px] font-semibold text-gray-900">{p.title}</div>
              <p className="mt-1 text-[12.5px] text-gray-600 leading-snug">{p.body}</p>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="buddy-study" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Your own words (optional)
        </label>
        <textarea
          id="buddy-study"
          rows={4}
          maxLength={200}
          value={draft.study_style}
          onChange={(e) => patch({ study_style: e.target.value })}
          placeholder="e.g. I retain best when I doodle. Don't overload me, one idea at a time."
          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none text-[14px] text-gray-900 placeholder-gray-400 resize-none transition-colors"
        />
        <p className="mt-1 text-[11px] text-gray-400 text-right">{draft.study_style.length}/200</p>
      </div>
    </div>
  );
}
