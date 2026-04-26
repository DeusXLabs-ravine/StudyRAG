import { useState } from 'react';
import { X } from 'lucide-react';

const INTEREST_SUGGESTIONS = [
  'football', 'basketball', 'gaming', 'anime', 'k-pop', 'hip-hop', 'jazz', 'rock',
  'cooking', 'baking', 'hiking', 'photography', 'movies', 'novels', 'history',
  'tech', 'startups', 'fashion', 'running', 'yoga', 'meditation',
];

const FIELD_SUGGESTIONS = [
  'medicine', 'biology', 'chemistry', 'physics', 'mathematics', 'statistics',
  'computer science', 'engineering', 'economics', 'psychology', 'philosophy',
  'law', 'linguistics', 'history', 'art', 'music theory',
];

function ChipInput({ values, onAdd, onRemove, suggestions, placeholder, max }) {
  const [input, setInput] = useState('');

  const commit = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.includes(v) && values.length < max) onAdd(v);
    setInput('');
  };

  const remaining = suggestions.filter(s => !values.includes(s)).slice(0, 12);

  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[12px] font-medium border border-amber-200"
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v}`}
                className="h-4 w-4 grid place-items-center rounded hover:bg-amber-100 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); commit(); }
          }}
          placeholder={placeholder}
          disabled={values.length >= max}
          className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none text-[14px] text-gray-900 placeholder-gray-400 disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!input.trim() || values.length >= max}
          className="px-3.5 py-2 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">{values.length}/{max}</p>

      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => values.length < max && onAdd(s)}
              disabled={values.length >= max}
              className="px-2.5 py-1 rounded-md bg-white text-[12px] text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepInterests({ draft, patch }) {
  const add = (field, v) => patch({ [field]: [...(draft[field] || []), v] });
  const remove = (field, v) => patch({ [field]: (draft[field] || []).filter(x => x !== v) });

  return (
    <div className="space-y-6">
      <p className="text-[14px] text-gray-600">
        What they reach for when making analogies, telling stories, or picking examples.
      </p>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Interests (hobbies, fandoms, vibes)
        </label>
        <ChipInput
          values={draft.interests}
          onAdd={(v) => add('interests', v)}
          onRemove={(v) => remove('interests', v)}
          suggestions={INTEREST_SUGGESTIONS}
          placeholder="e.g. soccer, cooking, anime"
          max={12}
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Fields they know well
        </label>
        <ChipInput
          values={draft.field_affinities}
          onAdd={(v) => add('field_affinities', v)}
          onRemove={(v) => remove('field_affinities', v)}
          suggestions={FIELD_SUGGESTIONS}
          placeholder="e.g. biology, economics, CS"
          max={6}
        />
      </div>
    </div>
  );
}
