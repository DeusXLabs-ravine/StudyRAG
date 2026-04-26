import useBuddyStore from '../../../store/buddyStore';

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      <span className="text-[14px] text-gray-900 text-right">{value}</span>
    </div>
  );
}

const RELATIONSHIP_LABEL = {
  new_friend:   'new friend',
  close_friend: 'close friend',
  rival:        'friendly rival',
  mentor:       'mentor',
};

const PLACEHOLDER = '\u2014';

export default function StepReview({ draft }) {
  const voices = useBuddyStore(s => s.voices);
  const voice = voices.find(v => v.id === draft.voice_id);
  const { energy, humor, formality, confidence } = draft.personality || {};

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-gray-600">
        Double-check everything. When you finish, {draft.name || 'your buddy'} will greet you out loud.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <Row label="Name"         value={draft.name || PLACEHOLDER} />
        <Row label="Pronouns"     value={draft.pronouns || PLACEHOLDER} />
        <Row label="Voice"        value={voice ? voice.label : draft.voice_id} />
        <Row label="Relationship" value={RELATIONSHIP_LABEL[draft.relationship_mode] || draft.relationship_mode} />
        <Row label="Energy"       value={energy || PLACEHOLDER} />
        <Row label="Humor"        value={humor || PLACEHOLDER} />
        <Row label="Formality"    value={formality || PLACEHOLDER} />
        <Row label="Confidence"   value={confidence || PLACEHOLDER} />
        <Row
          label="Interests"
          value={draft.interests?.length ? draft.interests.join(', ') : PLACEHOLDER}
        />
        <Row
          label="Fields"
          value={draft.field_affinities?.length ? draft.field_affinities.join(', ') : PLACEHOLDER}
        />
        {draft.study_style && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-[12px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Study style</div>
            <p className="text-[13.5px] text-gray-700 leading-snug">&ldquo;{draft.study_style}&rdquo;</p>
          </div>
        )}
      </div>

      <p className="text-[12px] text-gray-500">
        Your sessions stay private. Buddy only remembers what you choose to save, and you can wipe everything any time from Settings.
      </p>
    </div>
  );
}
