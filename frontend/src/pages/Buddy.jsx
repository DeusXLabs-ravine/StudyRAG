import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import useBuddyProfile from '../hooks/useBuddyProfile';
import { useSubscription } from '../hooks/useSubscription';
import BuddyShell from '../components/buddy/BuddyShell';
import BuddyWizard from '../components/buddy/wizard/BuddyWizard';
import UpgradeModal from '../components/paywall/UpgradeModal';

export default function BuddyPage() {
  const navigate = useNavigate();
  const { canUseBuddy } = useSubscription();
  const {
    profileLoaded,
    loadingProfile,
    needsOnboarding,
    profile,
  } = useBuddyProfile();

  const [showEdit, setShowEdit] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    document.title = 'Study Buddy · StudyRAG';
    return () => { document.title = 'StudyRAG'; };
  }, []);

  if (!canUseBuddy) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10 sm:py-16 flex items-start justify-center">
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-8">
          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0 h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 grid place-items-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider ring-1 ring-amber-100 mb-2">
                Max
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Study Buddy
              </h1>
            </div>
          </div>

          <p className="text-[15px] text-gray-600 leading-relaxed mb-2">
            A voice study partner you set up to match how you learn. You pick the name, the voice, the vibe, the things they know about.
          </p>
          <p className="text-[15px] text-gray-600 leading-relaxed mb-6">
            They listen while you explain, push back when something doesn&apos;t add up, and throw in their own take. More study group than tutor.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              Upgrade to Max
            </button>
            <button
              type="button"
              onClick={() => navigate('/study')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              Maybe later
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showUpgrade && (
          <UpgradeModal feature="buddy" onClose={() => setShowUpgrade(false)} />
        )}
      </div>
    );
  }

  if (!profileLoaded || loadingProfile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 grid place-items-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (needsOnboarding || showEdit) {
    return (
      <BuddyWizard
        initialProfile={showEdit ? profile : null}
        onDone={() => setShowEdit(false)}
        onCancel={showEdit ? () => setShowEdit(false) : () => navigate('/study')}
      />
    );
  }

  return (
    <BuddyShell
      onExit={() => navigate('/study')}
      onSettings={() => setShowEdit(true)}
      onOpenSage={() => navigate('/chat')}
    />
  );
}
