import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { listDocuments } from '@/services/core';
import {
  createPrepSession,
  generateExam,
  getExamHistory,
  listPrepSessions,
  submitExam,
  type QuizPayload,
  type QuizResult,
} from '@/services/practice';
import { colors, fonts, radius } from '@/lib/theme/tokens';

export default function ExamScreen() {
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState('20');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('30');
  const [exam, setExam] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [prepSessions, setPrepSessions] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [historyCount, setHistoryCount] = useState(0);

  async function refreshExamState() {
    const [nextDocs, nextPrepSessions, examHistory] = await Promise.all([
      listDocuments(),
      listPrepSessions(),
      getExamHistory(),
    ]);
    setDocuments(nextDocs);
    setPrepSessions(nextPrepSessions);
    setHistoryCount(examHistory.length);
  }

  useEffect(() => {
    refreshExamState().catch(() => undefined);
  }, []);

  async function createExamRequest() {
    try {
      const nextExam = await generateExam({
        documentId: selectedDocId || undefined,
        numQuestions: Number(numQuestions) || 20,
        difficulty: 'medium',
        timeLimitMinutes: Number(timeLimitMinutes) || 30,
      });
      setExam(nextExam);
      setAnswers(new Array(nextExam.questions.length).fill(''));
      setResult(null);
    } catch (error) {
      Alert.alert('Exam generation failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function submit() {
    if (!exam) return;
    try {
      const nextResult = await submitExam(exam.quizId || exam.id, answers, exam.questions);
      setResult(nextResult);
      await refreshExamState();
    } catch (error) {
      Alert.alert('Exam submission failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function createPrep() {
    if (!selectedDocId) return;
    try {
      await createPrepSession({
        documentIds: [selectedDocId],
        name: `Prep session ${new Date().toLocaleDateString()}`,
      });
      await refreshExamState();
    } catch (error) {
      Alert.alert('Could not create prep session', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle eyebrow="Exam Prep" title="Timed practice and prep sessions." subtitle="Mobile exam prep keeps the core generation and grading flow native, while prep content remains managed by the backend." />

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

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Pick a source document</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(document => document.status === 'ready')
              .map(document => (
                <Pressable
                  key={document.id}
                  onPress={() => setSelectedDocId(document.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selectedDocId === document.id ? colors.primary : colors.border,
                    backgroundColor: selectedDocId === document.id ? colors.primarySoft : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 12 }}>
                    {document.title || document.name || 'Document'}
                  </Text>
                </Pressable>
              ))}
          </View>
          <TextInput value={numQuestions} onChangeText={setNumQuestions} keyboardType="number-pad" placeholder="Question count" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <TextInput value={timeLimitMinutes} onChangeText={setTimeLimitMinutes} keyboardType="number-pad" placeholder="Time limit (minutes)" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PrimaryButton label="Generate exam" onPress={createExamRequest} disabled={!selectedDocId} />
            <PrimaryButton label="Create prep session" onPress={createPrep} variant="secondary" disabled={!selectedDocId} />
          </View>
        </View>
      </Card>

      {prepSessions.map(session => (
        <Card key={session.id}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>{session.name}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
            Status: {session.status || 'ready'}
          </Text>
        </Card>
      ))}

      {exam ? (
        <Card>
          <View style={{ gap: 16 }}>
            {exam.questions.map((question, index) => (
              <View key={`${question.question}-${index}`} style={{ gap: 10 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>
                  {index + 1}. {question.question}
                </Text>
                {question.options.map(option => (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setAnswers(current => current.map((entry, answerIndex) => (answerIndex === index ? option : entry)))
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: answers[index] === option ? colors.primary : colors.border,
                      backgroundColor: answers[index] === option ? colors.primarySoft : '#FFFFFF',
                      borderRadius: radius.md,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14 }}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <PrimaryButton label="Submit exam" onPress={submit} />
          </View>
        </Card>
      ) : null}

      {result ? (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 20 }}>
            Exam result: {result.score}/{result.total}
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            {result.feedback || 'Your timed exam has been graded and stored in StudyRAG.'}
          </Text>
        </Card>
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
} as const;
