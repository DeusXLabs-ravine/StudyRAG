import { useState, useRef } from 'react';
import useBuddyStore from '../../../store/buddyStore';

const PRONOUN_OPTIONS = ['she/her', 'he/him', 'they/them'];

export default function StepNameVoice({ draft, patch }) {
  const voices = useBuddyStore(s => s.voices);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const audioRef = useRef(null);

  const playSample = (e, voice) => {
    e.stopPropagation(); // Don't select the voice just by clicking play
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }

    const audio = new Audio(voice.sample_url);
    audio.onended = () => setPlayingVoiceId(null);
    audio.play().catch(err => {
      console.error('Failed to play voice sample:', err);
      setPlayingVoiceId(null);
    });
    
    audioRef.current = audio;
    setPlayingVoiceId(voice.id);
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="buddy-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          What should we call them?
        </label>
        <input
          id="buddy-name"
          type="text"
          value={draft.name}
          maxLength={40}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Milo, Wren, Kai"
          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none text-gray-900 placeholder-gray-400 text-[15px] transition-colors"
          autoFocus
        />
      </div>

      {/* Pronouns */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Pronouns
        </label>
        <div className="flex flex-wrap gap-2">
          {PRONOUN_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => patch({ pronouns: opt })}
              aria-pressed={draft.pronouns === opt}
              className={[
                'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border',
                draft.pronouns === opt
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
          <input
            type="text"
            value={PRONOUN_OPTIONS.includes(draft.pronouns) ? '' : draft.pronouns}
            maxLength={24}
            onChange={(e) => patch({ pronouns: e.target.value })}
            placeholder="Other"
            className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none max-w-[140px] transition-colors"
          />
        </div>
      </div>

      {/* Voice */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Voice
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {voices.map(v => {
            const selected = draft.voice_id === v.id;
            const isPlaying = playingVoiceId === v.id;
            
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => patch({ voice_id: v.id })}
                aria-pressed={selected}
                className={[
                  'text-left px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border relative group',
                  selected
                    ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-gray-900">{v.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => playSample(e, v)}
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                        isPlaying 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      ].join(' ')}
                      title={isPlaying ? "Stop sample" : "Play sample"}
                    >
                      {isPlaying ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    {selected && <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Active</span>}
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 line-clamp-1">{v.description}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-gray-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click the play icon to hear a sample of each voice.
        </p>
      </div>
    </div>
  );
}
