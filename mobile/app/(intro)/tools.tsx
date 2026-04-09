import { router } from 'expo-router';
import { FeatureCard } from '@/components/cards/FeatureCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { iconRegistry } from '@/lib/theme/iconRegistry';

export default function IntroToolsScreen() {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Capabilities"
        title="Teach, podcast, exam prep, analytics, simulations."
        subtitle="StudyRAG on mobile keeps the advanced surfaces too, not just the basics."
      />

      <FeatureCard icon={iconRegistry.learn} title="Learn" subtitle="Modules, lesson boards, tutor support, and source-grounded reading." onPress={() => {}} />
      <FeatureCard icon={iconRegistry.podcast} title="Podcast" subtitle="Section podcasts and audio-first study sessions for revision on the go." onPress={() => {}} tone="purple" />
      <FeatureCard icon={iconRegistry.analytics} title="Analytics" subtitle="Weak areas, activity, and progress summaries that help you course-correct." onPress={() => {}} tone="ink" />
      <FeatureCard icon={iconRegistry.simulations} title="Simulations" subtitle="Premium interactive study surfaces, including science and lab-style practice." onPress={() => {}} />

      <PrimaryButton label="See personalization" onPress={() => router.push('/(intro)/accessibility')} />
    </Screen>
  );
}
