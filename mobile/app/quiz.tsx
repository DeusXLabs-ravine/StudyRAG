import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { listDocuments } from '@/services/core';
import { generateQuiz, submitQuiz, type QuizPayload, type QuizResult } from '@/services/practice';
import { colors, fonts, radius } from '@/lib/theme/tokens';

export default function QuizScreen() {
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  async function createQuizRequest() {
    try {
      setLoading(true);
      const nextQuiz = await generateQuiz({
        documentId: selectedDocId || undefined,
        numQuestions: Number(numQuestions) || 10,
        difficulty,
        adaptive: true,
      });
      setQuiz(nextQuiz);
      setAnswers(new Array(nextQuiz.questions.length).fill(''));
      setResult(null);
    } catch (error) {
      Alert.alert('Quiz generation failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!quiz) return;
    try {
      setLoading(true);
      const nextResult = await submitQuiz(quiz.quizId || quiz.id, answers, quiz.questions);
      setResult(nextResult);
    } catch (error) {
      Alert.alert('Quiz submission failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle eyebrow="Quiz" title="Generate a quick adaptive quiz." subtitle="Choose one of your ready documents and StudyRAG will build a fresh quiz from that material." />

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Source document</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(document => document.status === 'ready')
              .map(document => (
                <Pressable
                  key={document.id}
                  onPress={() => setSelectedDocId(document.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedDocId === document.id ? colors.primary : colors.border,
                    borderRadius: 999,
                    backgroundColor: selectedDocId === document.id ? colors.primarySoft : '#FFFFFF',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 12 }}>
                    {document.title || document.name || 'Document'}
                  </Text>
                </Pressable>
              ))}
          </View>
          <TextInput value={numQuestions} onChangeText={setNumQuestions} keyboardType="number-pad" placeholder="Number of questions" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as const).map(level => (
              <PrimaryButton key={level} label={level} onPress={() => setDifficulty(level)} variant={difficulty === level ? 'primary' : 'secondary'} />
            ))}
          </View>
          <PrimaryButton label={loading ? 'Generating...' : 'Generate quiz'} onPress={createQuizRequest} disabled={loading || !selectedDocId} />
        </View>
      </Card>

      {quiz ? (
        <Card>
          <View style={{ gap: 16 }}>
            {quiz.questions.map((question, index) => (
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
            <PrimaryButton label={loading ? 'Submitting...' : 'Submit quiz'} onPress={submit} disabled={loading} />
          </View>
        </Card>
      ) : null}

      {result ? (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBlack, fontSize: 20 }}>
              Score: {result.score}/{result.total}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
              {result.feedback || 'Your quiz has been graded and stored in StudyRAG analytics.'}
            </Text>
          </View>
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
