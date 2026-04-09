import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { FeatureCard } from '@/components/cards/FeatureCard';
import { iconRegistry } from '@/lib/theme/iconRegistry';

export default function PracticeTabScreen() {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Practice"
        title="Reinforce, revise, and measure progress."
        subtitle="Everything practice-related lives here: quick quizzes, spaced repetition, exam prep, analytics, simulations, and premium teach/podcast tools."
      />

      <FeatureCard icon={iconRegistry.quiz} title="Quiz" subtitle="Generate adaptive quizzes from your uploaded study material." onPress={() => router.push('/quiz')} />
      <FeatureCard icon={iconRegistry.flashcards} title="Flashcards" subtitle="Build decks and review your study queue with spaced repetition." onPress={() => router.push('/flashcards')} tone="purple" />
      <FeatureCard icon={iconRegistry.exam} title="Exam Prep" subtitle="Generate timed exams and manage prep sessions from selected documents." onPress={() => router.push('/exam')} />
      <FeatureCard icon={iconRegistry.analytics} title="Analytics" subtitle="Review weak areas, activity, streaks, and study momentum." onPress={() => router.push('/analytics')} tone="ink" />
      <FeatureCard icon={iconRegistry.simulations} title="Simulations" subtitle="Open the premium simulation catalog and generate custom simulation parameters." onPress={() => router.push('/simulations')} />
      <FeatureCard icon={iconRegistry.podcast} title="Podcast" subtitle="Browse section podcasts and audio-first review sessions." onPress={() => router.push('/podcast')} tone="purple" />
      <FeatureCard icon={iconRegistry.teach} title="Teach Mode" subtitle="Access live-teach premium workflows and mobile audio study surfaces." onPress={() => router.push('/teach')} />
    </Screen>
  );
}
