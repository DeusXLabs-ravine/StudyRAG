import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import useBuddyStore from '../../../store/buddyStore';
import StepPreset from './StepPreset';
import StepNameVoice from './StepNameVoice';
import StepPersonality from './StepPersonality';
import StepRelationship from './StepRelationship';
import StepInterests from './StepInterests';
import StepStudyStyle from './StepStudyStyle';
import StepReview from './StepReview';
import BuddyOrb from '../BuddyOrb';

const STEPS = [
  { id: 'preset',        title: 'Pick a starting vibe',  render: StepPreset },
  { id: 'name',          title: 'Name and voice',        render: StepNameVoice },
  { id: 'personality',   title: 'Personality',           render: StepPersonality },
  { id: 'relationship',  title: 'How do you know them?', render: StepRelationship },
  { id: 'interests',     title: 'What are they into?',   render: StepInterests },
  { id: 'style',         title: 'Study style',           render: StepStudyStyle },
  { id: 'review',        title: 'Meet your buddy',       render: StepReview },
];

const EMPTY_DRAFT = {
  presetKey: null,
  name: '',
  pronouns: 'they/them',
  voice_id: 'warm-mid',
  personality: { energy: 'medium', humor: 'neutral', formality: 'balanced', confidence: 'balanced' },
  relationship_mode: 'new_friend',
  interests: [],
  field_affinities: [],
  study_style: '',
};

export default function BuddyWizard({ initialProfile = null, onDone, onCancel }) {
  const isEdit = Boolean(initialProfile);
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState(() => {
    if (!initialProfile) return EMPTY_DRAFT;
    return {
      presetKey: null,
      name: initialProfile.name || '',
      pronouns: initialProfile.pronouns || 'they/them',
      voice_id: initialProfile.voice_id || 'warm-mid',
      personality: {
        energy: initialProfile.personality?.energy || 'medium',
        humor: initialProfile.personality?.humor || 'neutral',
        formality: initialProfile.personality?.formality || 'balanced',
        confidence: initialProfile.personality?.confidence || 'balanced',
      },
      relationship_mode: initialProfile.relationship_mode || 'new_friend',
      interests: initialProfile.interests || [],
      field_affinities: initialProfile.field_affinities || [],
      study_style: initialProfile.study_style || '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createProfile = useBuddyStore(s => s.createProfile);
  const updateProfile = useBuddyStore(s => s.updateProfile);
  const loadCatalog = useBuddyStore(s => s.loadCatalog);

  useMemo(() => { loadCatalog(); return null; }, [loadCatalog]);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  const patch = (p) => setDraft(d => ({ ...d, ...p }));

  const canAdvance = useMemo(() => {
    switch (step.id) {
      case 'name': return !!draft.name.trim();
      default: return true;
    }
  }, [step.id, draft.name]);

  const handleNext = () => {
    if (!canAdvance) return;
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
  };
  const handleBack = () => setStepIdx(i => Math.max(i - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        pronouns: draft.pronouns,
        voice_id: draft.voice_id,
        personality: draft.personality,
        relationship_mode: draft.relationship_mode,
        interests: draft.interests,
        field_affinities: draft.field_affinities,
        study_style: draft.study_style,
      };
      if (isEdit) {
        await updateProfile(payload);
      } else {
        await createProfile({ ...payload, presetKey: draft.presetKey || undefined });
      }
      onDone?.();
    } catch (e) {
      setError(e?.message || 'Could not save your buddy. Try again?');
    } finally {
      setSaving(false);
    }
  };

  const StepBody = step.render;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={isFirst ? (onCancel || (() => {})) : handleBack}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirst ? 'Cancel' : 'Back'}
          </button>
          <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
            {isEdit ? 'Edit buddy' : 'New buddy'} · {stepIdx + 1} of {STEPS.length}
          </span>
          <span className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500"
              initial={false}
              animate={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <div className="flex flex-col items-center">
          <BuddyOrb size={160} />
          <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
            {step.title}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 sm:p-6"
          >
            <StepBody draft={draft} patch={patch} />
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 inset-x-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={isFirst ? (onCancel || (() => {})) : handleBack}
            className="px-4 py-2.5 rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
          >
            {isFirst ? 'Cancel' : 'Back'}
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving || !draft.name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Save changes' : 'Finish setup'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 text-center text-[11px] text-gray-400">
          You can change any of this later.
        </div>
      </footer>
    </div>
  );
}
