import { Mic, MicOff, Phone, Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import useBuddyStore from '../../store/buddyStore';
import { useState } from 'react';

export default function BuddyToolbar({
  muted,
  onToggleMute,
  onHangUp,
  onSendText,
  onAcceptSageHandoff,
}) {
  const [draft, setDraft] = useState('');
  const status = useBuddyStore(s => s.live.status);
  const sageHandoff = useBuddyStore(s => s.live.sageHandoff);
  const isActive = status === 'listening' || status === 'speaking';

  const submitDraft = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSendText?.(text);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-xl mx-auto">
      {sageHandoff && onAcceptSageHandoff && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onAcceptSageHandoff}
          className="self-center inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100 hover:bg-violet-100 cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Switch to Sage to go deeper{sageHandoff.reason ? `: ${sageHandoff.reason}` : ''}
        </motion.button>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!isActive}
          aria-label={muted ? 'Unmute mic' : 'Mute mic'}
          aria-pressed={muted}
          className={[
            'h-11 w-11 rounded-xl grid place-items-center transition-colors cursor-pointer border',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            muted
              ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
          ].join(' ')}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <form
          onSubmit={submitDraft}
          className={[
            'flex-1 flex items-center gap-2 px-3 h-11 rounded-xl bg-white/80 backdrop-blur border transition-all',
            'focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-100',
            status === 'listening'
              ? 'border-stone-300/80 buddy-toolbar-listening'
              : 'border-stone-200',
          ].join(' ')}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type instead of talking"
            className="flex-1 bg-transparent text-[15px] text-stone-900 placeholder-stone-400 outline-none"
            aria-label="Send Buddy a text message"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !isActive}
            aria-label="Send message"
            className="h-8 w-8 rounded-lg grid place-items-center text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={onHangUp}
          aria-label="End session"
          className="h-11 w-11 rounded-xl grid place-items-center bg-red-600 text-white hover:bg-red-700 cursor-pointer transition-colors"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}
