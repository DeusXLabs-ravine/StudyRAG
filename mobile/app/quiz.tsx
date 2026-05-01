import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CheckCircle, ChevronRight, RotateCcw, XCircle } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/ui/TopBar';
import { listDocuments } from '@/services/core';
import { generateQuiz, submitQuiz, type QuizQuestion, type QuizPayload, type QuizResult } from '@/services/practice';
import { colors, fonts, radius, spacing } from '@/lib/theme/tokens';

// ─── Setup phase ──────────────────────────────────────────────────────────────

type Phase = 'setup' | 'quiz' | 'result';

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

function optionColors(state: OptionState): {
  border: string;
  background: string;
  text: string;
} {
  switch (state) {
    case 'correct':
      return { border: colors.success, background: colors.successSoft, text: colors.success };
    case 'wrong':
      return { border: colors.danger, background: colors.dangerSoft, text: colors.danger };
    case 'selected':
      return { border: colors.primary, background: colors.primarySoft, text: colors.primary };
    default:
      return { border: colors.border, background: colors.surface, text: colors.text };
  }
}

function getOptionState(
  option: string,
  selectedAnswer: string,
  correctAnswer: string | undefined,
  revealed: boolean,
): OptionState {
  if (!revealed) {
    return selectedAnswer === option ? 'selected' : 'idle';
  }
  if (option === correctAnswer) return 'correct';
  if (option === selectedAnswer && option !== correctAnswer) return 'wrong';
  return 'idle';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
        }}
      >
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 13 }}>
          Question {current} of {total}
        </Text>
        <Text style={{ color: colors.primary, fontFamily: fonts.uiBold, fontSize: 13 }}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: colors.primary,
            borderRadius: 99,
          }}
        />
      </View>
    </View>
  );
}

function OptionRow({
  option,
  state,
  onPress,
  disabled,
}: {
  option: string;
  state: OptionState;
  onPress: () => void;
  disabled: boolean;
}) {
  const palette = optionColors(state);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected' || state === 'correct' || state === 'wrong' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1.5,
        borderColor: palette.border,
        backgroundColor: palette.background,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: pressed && !disabled ? 0.85 : 1,
      })}
    >
      {/* State icon */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: state === 'idle' ? 1.5 : 0,
          borderColor: colors.border,
          backgroundColor:
            state === 'correct'
              ? colors.success
              : state === 'wrong'
                ? colors.danger
                : state === 'selected'
                  ? colors.primary
                  : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state === 'correct' ? (
          <CheckCircle size={14} color={colors.surface} strokeWidth={2.5} />
        ) : state === 'wrong' ? (
          <XCircle size={14} color={colors.surface} strokeWidth={2.5} />
        ) : null}
      </View>
      <Text
        style={{
          flex: 1,
          color: palette.text,
          fontFamily: state !== 'idle' ? fonts.uiBold : fonts.uiMedium,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {option}
      </Text>
    </Pressable>
  );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

function SetupView({
  onStart,
}: {
  onStart: (docId: string, numQ: number, difficulty: 'easy' | 'medium' | 'hard') => void;
}) {
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  async function handleStart() {
    setLoading(true);
    try {
      onStart(selectedDocId, Number(numQuestions) || 10, difficulty);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Source document</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(d => d.status === 'ready')
              .map(d => (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDocId(d.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedDocId === d.id ? colors.primary : colors.border,
                    borderRadius: 999,
                    backgroundColor: selectedDocId === d.id ? colors.primarySoft : colors.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: selectedDocId === d.id ? colors.primary : colors.text,
                      fontFamily: fonts.uiBold,
                      fontSize: 13,
                    }}
                  >
                    {d.title || d.name || 'Document'}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Questions</Text>
          <TextInput
            value={numQuestions}
            onChangeText={setNumQuestions}
            keyboardType="number-pad"
            placeholderTextColor={colors.textSoft}
            style={fieldStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Difficulty</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as const).map(level => (
              <Pressable
                key={level}
                onPress={() => setDifficulty(level)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: difficulty === level ? colors.primary : colors.border,
                  backgroundColor: difficulty === level ? colors.primarySoft : colors.surface,
                }}
              >
                <Text
                  style={{
                    color: difficulty === level ? colors.primary : colors.textMuted,
                    fontFamily: fonts.uiBold,
                    fontSize: 13,
                    textTransform: 'capitalize',
                  }}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <PrimaryButton
          label={loading ? 'Generating…' : 'Start quiz'}
          onPress={handleStart}
          disabled={loading || !selectedDocId}
          loading={loading}
        />
      </View>
    </Card>
  );
}

// ─── Quiz taking view ─────────────────────────────────────────────────────────

function QuizView({
  quiz,
  onFinish,
}: {
  quiz: QuizPayload;
  onFinish: (answers: string[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(quiz.questions.length).fill(''));
  const [revealed, setRevealed] = useState(false);

  const currentQuestion: QuizQuestion = quiz.questions[index];
  const selectedAnswer = answers[index] ?? '';
  const isLast = index === quiz.questions.length - 1;

  function selectOption(option: string) {
    if (revealed) return;
    const next = answers.map((a, i) => (i === index ? option : a));
    setAnswers(next);
    setRevealed(true);

    const correct = currentQuestion.answer;
    if (correct) {
      if (option === correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function advance() {
    if (isLast) {
      onFinish(answers);
    } else {
      setIndex(i => i + 1);
      setRevealed(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <ProgressBar current={index + 1} total={quiz.questions.length} />

      <Card>
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 19, lineHeight: 28 }}>
            {currentQuestion.question}
          </Text>

          <View style={{ gap: 10 }}>
            {currentQuestion.options.map(option => (
              <OptionRow
                key={option}
                option={option}
                state={getOptionState(option, selectedAnswer, currentQuestion.answer, revealed)}
                onPress={() => selectOption(option)}
                disabled={revealed}
              />
            ))}
          </View>

          {revealed && currentQuestion.explanation ? (
            <View
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: radius.sm,
                padding: 14,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 12, marginBottom: 4 }}>
                EXPLANATION
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 21 }}>
                {currentQuestion.explanation}
              </Text>
            </View>
          ) : null}

          {revealed ? (
            <PrimaryButton
              label={isLast ? 'See results' : 'Next question'}
              onPress={advance}
              icon={ChevronRight}
              iconPosition="trailing"
            />
          ) : null}
        </View>
      </Card>
    </View>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  result,
  onRetry,
}: {
  result: QuizResult;
  onRetry: () => void;
}) {
  const pct = result.percentage ?? (result.total > 0 ? Math.round((result.score / result.total) * 100) : 0);
  const passed = pct >= 70;

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Text style={{ fontSize: 52 }}>{passed ? '🎉' : '📚'}</Text>
        <Text
          style={{
            color: passed ? colors.success : colors.warning,
            fontFamily: fonts.uiBlack,
            fontSize: 52,
            marginTop: 8,
          }}
        >
          {pct}%
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 18, marginTop: 4 }}>
          {result.score} / {result.total} correct
        </Text>
        {result.feedback ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {result.feedback}
          </Text>
        ) : null}
      </Card>

      {result.weakTopics?.length ? (
        <Card>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14, marginBottom: 10 }}>
            Topics to review
          </Text>
          <View style={{ gap: 6 }}>
            {result.weakTopics.map(topic => (
              <View
                key={topic}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.warning,
                  }}
                />
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>{topic}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <PrimaryButton label="Try again" onPress={onRetry} icon={RotateCcw} />
        <PrimaryButton label="Back to home" onPress={() => router.back()} variant="secondary" />
      </View>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart(docId: string, numQ: number, difficulty: 'easy' | 'medium' | 'hard') {
    try {
      setLoading(true);
      const next = await generateQuiz({ documentId: docId || undefined, numQuestions: numQ, difficulty, adaptive: true });
      setQuiz(next);
      setResult(null);
      setPhase('quiz');
    } catch (error) {
      Alert.alert('Quiz generation failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish(answers: string[]) {
    if (!quiz) return;
    try {
      setLoading(true);
      const next = await submitQuiz(quiz.quizId ?? quiz.id, answers, quiz.questions);
      setResult(next);
      setPhase('result');
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setPhase('setup');
    setQuiz(null);
    setResult(null);
  }

  return (
    <Screen>
      <TopBar
        eyebrow="Practice"
        title="Quiz"
        left={
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: pressed ? colors.border : colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ChevronRight
              size={18}
              color={colors.textMuted}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
        }
      />

      {phase === 'setup' ? (
        <>
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 24 }}>
              Adaptive quiz
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>
              StudyRAG builds a fresh quiz from your material each time.
            </Text>
          </View>
          <SetupView onStart={handleStart} />
        </>
      ) : phase === 'quiz' && quiz ? (
        <QuizView quiz={quiz} onFinish={handleFinish} />
      ) : phase === 'result' && result ? (
        <ResultView result={result} onRetry={handleRetry} />
      ) : null}
    </Screen>
  );
}

const fieldStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: fonts.uiMedium,
  color: colors.text,
  fontSize: 15,
} as const;
