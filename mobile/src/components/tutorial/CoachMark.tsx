import { Modal, Pressable, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useTutorial } from './TutorialProvider';

type Props = {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onDismiss?: () => void;
};

/**
 * Single-modal coach mark. Persistent-dismissed by id (`TutorialProvider` tracks
 * which ones have been seen in AsyncStorage). For sequential walkthroughs,
 * compose multiple steps with `TutorialTour` instead.
 */
export function CoachMark({ id, title, body, ctaLabel = 'Got it', onDismiss }: Props) {
  const { hasSeen, markSeen, isLoaded } = useTutorial();
  if (!isLoaded || hasSeen(id)) return null;

  const dismiss = () => {
    markSeen(id);
    onDismiss?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.72)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={dismiss} />
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: '#FFFFFF',
            borderRadius: radius.lg,
            padding: 22,
            gap: 14,
          }}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 18 }}>{title}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            {body}
          </Text>
          <PrimaryButton label={ctaLabel} onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}
