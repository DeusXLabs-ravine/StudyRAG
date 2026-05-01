import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, ChevronRight, Clock, RotateCcw, Trophy } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/ui/TopBar';
import { listDocuments } from '@/services/core';
import {
  createPrepSession,
  generateExam,
  getExamHistory,
  listPrepSessions,
  submitExam,
  type QuizPayload,
  type QuizQuestion,
  type QuizResult,
} from '@/services/practice';
import { colors, fonts, radius, spacing } from '@/lib/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'exam' | 'result';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timerColor(secondsLeft: number, totalSeconds: number): string {
  void totalSeconds;
  if (secondsLeft <= 60) return colors.danger;
  if (secondsLeft <= 300) return colors.warning;
  return colors.primary;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map(opt => (
          <Pressable
            key={opt}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(opt);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderColor: value === opt ? colors.primary : colors.border,
              backgroundColor: value === opt ? colors.primarySoft : colors.surface,
            }}
          >
            <Text
              style={{
                color: value === opt ? colors.primary : colors.textMuted,
                fontFamily: fonts.uiBold,
                fontSize: 14,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Setup view ───────────────────────────────────────────────────────────────

function SetupView({
  onStart,
  prepSessions,
  historyCount,
  onCreatePrep,
}: {
  onStart: (params: {
    docId: string;
    docName: string;
    numQuestions: number;
    timeLimitMinutes: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }) => void;
  prepSessions: Array<{ id: string; name: string; status?: string }>;
  historyCount: number;
  onCreatePrep: (docId: string) => void;
}) {
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const selectedDocName = selectedDoc?.title ?? selectedDoc?.name ?? 'Exam';

  async function handleStart() {
    setLoading(true);
    try {
      await onStart({ docId: selectedDocId, docName: selectedDocName, numQuestions, timeLimitMinutes, difficulty });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>Past exams</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 28 }}>{historyCount}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 12 }}>Prep sessions</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 28 }}>{prepSessions.length}</Text>
        </Card>
      </View>

      {/* Config card */}
      <Card>
        <View style={{ gap: spacing.md }}>
          {/* Document picker */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Source document</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {documents
                .filter(d => d.status === 'ready')
                .map(d => (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDocId(d.id);
                    }}
                    style={{
                      borderWidth: 1.5,
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
                      {d.title ?? d.name ?? 'Document'}
                    </Text>
                  </Pressable>
                ))}
              {documents.filter(d => d.status === 'ready').length === 0 && (
                <Text style={{ color: colors.textSoft, fontFamily: fonts.uiMedium, fontSize: 14 }}>
                  No ready documents yet.
                </Text>
              )}
            </View>
          </View>

          {/* Question count */}
          <Stepper
            label="Questions"
            value={numQuestions}
            options={[10, 20, 30, 40]}
            onChange={setNumQuestions}
          />

          {/* Time limit */}
          <Stepper
            label="Time limit (min)"
            value={timeLimitMinutes}
            options={[15, 30, 45, 60]}
            onChange={setTimeLimitMinutes}
          />

          {/* Difficulty */}
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <Pressable
                  key={level}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDifficulty(level);
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: radius.sm,
                    borderWidth: 1.5,
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

          {/* Actions */}
          <View style={{ gap: 10 }}>
            <PrimaryButton
              label={loading ? 'Generating…' : 'Start exam'}
              onPress={handleStart}
              disabled={loading || !selectedDocId}
              loading={loading}
            />
            <PrimaryButton
              label="Create prep session"
              onPress={() => onCreatePrep(selectedDocId)}
              variant="secondary"
              disabled={!selectedDocId}
            />
          </View>
        </View>
      </Card>

      {/* Prep sessions list */}
      {prepSessions.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.textSoft,
              fontFamily: fonts.uiBold,
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              paddingHorizontal: 2,
            }}
          >
            Prep sessions
          </Text>
          {prepSessions.map(session => (
            <Card key={session.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{session.name}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                    {session.status ?? 'ready'}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: colors.primarySoft,
                  }}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.uiBold, fontSize: 11 }}>
                    {session.status ?? 'Ready'}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const animWidth = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pct = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft, totalSeconds]);

  const color = timerColor(secondsLeft, totalSeconds);

  return (
    <View
      style={{
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 99,
        overflow: 'hidden',
        width: 80,
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 99,
          backgroundColor: color,
          width: animWidth.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

// ─── Exam view ────────────────────────────────────────────────────────────────

function ExamView({
  exam,
  timeLimitMinutes,
  onSubmit,
}: {
  exam: QuizPayload;
  timeLimitMinutes: number;
  onSubmit: (answers: string[], timeSpentSeconds: number) => void;
}) {
  const totalSeconds = timeLimitMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(exam.questions.length).fill(''));
  const startTimeRef = useRef(Date.now());
  const fiveMinWarned = useRef(false);
  const oneMinWarned = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion: QuizQuestion = exam.questions[index];
  const isLast = index === exam.questions.length - 1;
  const selectedAnswer = answers[index] ?? '';

  function getTimeSpent(): number {
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }

  function doSubmit(currentAnswers: string[]) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onSubmit(currentAnswers, getTimeSpent());
  }

  function handleAbandon() {
    Alert.alert(
      'Abandon exam?',
      'Your progress will be lost. This cannot be undone.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            router.back();
          },
        },
      ],
    );
  }

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;

        // Haptic warnings
        if (next <= 300 && !fiveMinWarned.current) {
          fiveMinWarned.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        if (next <= 60 && !oneMinWarned.current) {
          oneMinWarned.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }

        if (next <= 0) {
          clearInterval(intervalRef.current!);
          // Auto-submit with current answers snapshot via callback
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-submit when time hits 0
  useEffect(() => {
    if (secondsLeft <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Time's up!", 'Your exam is being submitted now.', [
        {
          text: 'OK',
          onPress: () => doSubmit(answers),
        },
      ]);
    }
  }, [secondsLeft]);

  function selectOption(option: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers(prev => prev.map((a, i) => (i === index ? option : a)));
  }

  function advance() {
    if (isLast) {
      Alert.alert(
        'Submit exam?',
        `You've answered ${answers.filter(a => a !== '').length} of ${exam.questions.length} questions.`,
        [
          { text: 'Review', style: 'cancel' },
          {
            text: 'Submit',
            onPress: () => doSubmit(answers),
          },
        ],
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIndex(i => i + 1);
    }
  }

  const timerCol = timerColor(secondsLeft, totalSeconds);

  return (
    <View style={{ flex: 1, gap: 0 }}>
      {/* Exam header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          gap: 12,
        }}
      >
        {/* Abandon button */}
        <Pressable
          onPress={handleAbandon}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.sm,
            backgroundColor: pressed ? colors.dangerSoft : colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          })}
        >
          <Text style={{ color: colors.danger, fontFamily: fonts.uiBold, fontSize: 13 }}>Abandon</Text>
        </Pressable>

        {/* Center: EXAM · Q N / total */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              color: colors.textSoft,
              fontFamily: fonts.uiBold,
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Exam
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 15 }}>
            Q {index + 1} / {exam.questions.length}
          </Text>
        </View>

        {/* Right: timer */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Clock size={12} color={timerCol} strokeWidth={2.5} />
            <Text
              style={{
                color: timerCol,
                fontFamily: fonts.uiBlack,
                fontSize: 15,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatTime(secondsLeft)}
            </Text>
          </View>
          <TimerBar secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
        </View>
      </View>

      {/* Question card */}
      <Card style={{ flex: 0 }}>
        <View style={{ gap: spacing.md }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.uiBlack,
              fontSize: 18,
              lineHeight: 27,
            }}
          >
            {currentQuestion.question}
          </Text>

          <View style={{ gap: 10 }}>
            {currentQuestion.options.map(option => {
              const selected = selectedAnswer === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => selectOption(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {/* Radio dot */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: colors.border,
                      backgroundColor: selected ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: selected ? colors.primaryDeep : colors.text,
                      fontFamily: selected ? fonts.uiBold : fonts.uiMedium,
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton
            label={isLast ? 'Submit exam' : 'Next'}
            onPress={advance}
            icon={ChevronRight}
            iconPosition="trailing"
            disabled={selectedAnswer === ''}
          />
        </View>
      </Card>

      {/* Progress dots */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 5,
          marginTop: spacing.md,
          paddingHorizontal: 2,
        }}
      >
        {exam.questions.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i === index
                  ? colors.primary
                  : answers[i] !== ''
                    ? colors.primaryDeep
                    : colors.border,
            }}
          />
        ))}
      </View>
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

  useEffect(() => {
    if (passed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  return (
    <View style={{ gap: spacing.md }}>
      {/* Score hero */}
      <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: passed ? colors.successSoft : colors.warningSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Trophy size={34} color={passed ? colors.success : colors.warning} strokeWidth={2} />
        </View>
        <Text
          style={{
            color: passed ? colors.success : colors.warning,
            fontFamily: fonts.uiBlack,
            fontSize: 58,
          }}
        >
          {pct}%
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.uiBold,
            fontSize: 18,
            marginTop: 4,
          }}
        >
          {result.score} / {result.total} correct
        </Text>
        <View
          style={{
            marginTop: 10,
            paddingHorizontal: 16,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: passed ? colors.successSoft : colors.warningSoft,
          }}
        >
          <Text
            style={{
              color: passed ? colors.success : colors.warning,
              fontFamily: fonts.uiBold,
              fontSize: 13,
            }}
          >
            {passed ? 'Passed' : 'Needs improvement'}
          </Text>
        </View>
        {result.feedback ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            {result.feedback}
          </Text>
        ) : null}
      </Card>

      {/* Weak topics */}
      {result.weakTopics?.length ? (
        <Card>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.uiBold,
              fontSize: 14,
              marginBottom: spacing.sm,
            }}
          >
            Topics to review
          </Text>
          <View style={{ gap: 8 }}>
            {result.weakTopics.map(topic => (
              <View
                key={topic}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: colors.warningSoft,
                  borderRadius: radius.sm,
                }}
              >
                <AlertTriangle size={14} color={colors.warning} strokeWidth={2.5} />
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.uiMedium,
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Actions */}
      <View style={{ gap: 10 }}>
        <PrimaryButton label="Retry exam" onPress={onRetry} icon={RotateCcw} />
        <PrimaryButton label="Back to home" onPress={() => router.back()} variant="secondary" />
      </View>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function ExamScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [exam, setExam] = useState<QuizPayload | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [docName, setDocName] = useState('Exam');
  const [loading, setLoading] = useState(false);
  const [prepSessions, setPrepSessions] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [historyCount, setHistoryCount] = useState(0);

  async function refreshExamState() {
    const [nextPrepSessions, examHistory] = await Promise.all([listPrepSessions(), getExamHistory()]);
    setPrepSessions(nextPrepSessions);
    setHistoryCount(examHistory.length);
  }

  useEffect(() => {
    refreshExamState().catch(() => undefined);
  }, []);

  async function handleStart(params: {
    docId: string;
    docName: string;
    numQuestions: number;
    timeLimitMinutes: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }) {
    try {
      setLoading(true);
      const next = await generateExam({
        documentId: params.docId || undefined,
        numQuestions: params.numQuestions,
        difficulty: params.difficulty,
        timeLimitMinutes: params.timeLimitMinutes,
      });
      setExam(next);
      setTimeLimitMinutes(params.timeLimitMinutes);
      setDocName(params.docName);
      setResult(null);
      setPhase('exam');
    } catch (error) {
      Alert.alert('Exam generation failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(answers: string[], timeSpentSeconds: number) {
    if (!exam) return;
    try {
      setLoading(true);
      const next = await submitExam(exam.quizId ?? exam.id, answers, exam.questions, timeSpentSeconds);
      setResult(next);
      setPhase('result');
      await refreshExamState();
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePrep(docId: string) {
    if (!docId) return;
    try {
      await createPrepSession({
        documentIds: [docId],
        name: `Prep session ${new Date().toLocaleDateString()}`,
      });
      await refreshExamState();
    } catch (error) {
      Alert.alert('Could not create prep session', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function handleRetry() {
    setPhase('setup');
    setExam(null);
    setResult(null);
  }

  // During exam phase, TopBar title shows the document name
  const topBarTitle = phase === 'exam' ? docName : phase === 'result' ? 'Results' : 'Timed exam';

  return (
    <Screen>
      {/* TopBar — hide during exam phase (replaced by custom exam header) */}
      {phase !== 'exam' && (
        <TopBar
          eyebrow="Exam"
          title={topBarTitle}
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
      )}

      {phase === 'setup' ? (
        <>
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 24 }}>
              Timed exam
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>
              No hints. No feedback. Real exam conditions.
            </Text>
          </View>
          <SetupView
            onStart={handleStart}
            prepSessions={prepSessions}
            historyCount={historyCount}
            onCreatePrep={handleCreatePrep}
          />
        </>
      ) : phase === 'exam' && exam ? (
        <ExamView
          exam={exam}
          timeLimitMinutes={timeLimitMinutes}
          onSubmit={handleSubmit}
        />
      ) : phase === 'result' && result ? (
        <ResultView result={result} onRetry={handleRetry} />
      ) : null}
    </Screen>
  );
}
