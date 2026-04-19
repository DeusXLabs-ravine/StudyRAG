import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useTutorial } from './TutorialProvider';

export type TourStep = {
  id: string;
  title: string;
  body: string;
};

type Props = {
  tourId: string;
  steps: TourStep[];
};

const PROGRESS_PREFIX = 'studyrag.tutorials.tour.';

/**
 * Sequential walkthrough tied to a tour id. Remembers where the user is
 * so a force-quit mid-tour resumes instead of restarting.
 */
export function TutorialTour({ tourId, steps }: Props) {
  const { hasSeen, markSeen, isLoaded } = useTutorial();
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (hasSeen(tourId)) {
      setStep(null);
      return;
    }
    AsyncStorage.getItem(`${PROGRESS_PREFIX}${tourId}`)
      .then(raw => {
        const saved = raw ? Number(raw) : 0;
        setStep(Number.isFinite(saved) && saved >= 0 && saved < steps.length ? saved : 0);
      })
      .catch(() => setStep(0));
  }, [isLoaded, hasSeen, tourId, steps.length]);

  if (step === null || step < 0 || step >= steps.length) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const advance = () => {
    if (isLast) {
      markSeen(tourId);
      AsyncStorage.removeItem(`${PROGRESS_PREFIX}${tourId}`).catch(() => undefined);
      setStep(null);
    } else {
      const next = step + 1;
      AsyncStorage.setItem(`${PROGRESS_PREFIX}${tourId}`, String(next)).catch(() => undefined);
      setStep(next);
    }
  };

  const skip = () => {
    markSeen(tourId);
    AsyncStorage.removeItem(`${PROGRESS_PREFIX}${tourId}`).catch(() => undefined);
    setStep(null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={skip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.72)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={skip} />
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#FFFFFF',
            borderRadius: radius.lg,
            padding: 22,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.4 }}>
              {`STEP ${step + 1} OF ${steps.length}`}
            </Text>
            <Pressable onPress={skip} hitSlop={10}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 12 }}>Skip</Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 18 }}>{current.title}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            {current.body}
          </Text>

          {/* progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 2 }}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === step ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          <PrimaryButton label={isLast ? 'Finish' : 'Next'} onPress={advance} />
        </View>
      </View>
    </Modal>
  );
}
