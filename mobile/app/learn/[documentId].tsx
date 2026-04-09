import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { BookOpen, MessageSquareText } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import {
  getDocument,
  getTutorGreeting,
  listModules,
  sendTutorMessage,
  type ChatMessage,
  type StudyDocument,
  type StudyModule,
} from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';

function renderLessonHtml(module: StudyModule | null) {
  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0F172A; background: #FFFFFF; padding: 24px; line-height: 1.65; }
        h1, h2, h3 { color: #0F172A; }
        p, li { font-size: 16px; }
        code, pre { background: #F8FAFC; border-radius: 12px; padding: 2px 6px; }
      </style>
    </head>
    <body>
      <h1>${module?.title || 'Lesson'}</h1>
      <div>${(module?.content || 'Module content will appear here once generated.').replace(/\n/g, '<br/>')}</div>
    </body>
  </html>`;
}

export default function LearnDocumentScreen() {
  const params = useLocalSearchParams<{ documentId: string }>();
  const documentId = Array.isArray(params.documentId) ? params.documentId[0] : params.documentId;

  const [document, setDocument] = useState<StudyDocument | null>(null);
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [currentModule, setCurrentModule] = useState<StudyModule | null>(null);
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    getDocument(documentId).then(setDocument).catch(() => setDocument(null));
    listModules(documentId)
      .then(({ modules }) => {
        setModules(modules || []);
        setCurrentModule(modules?.[0] || null);
      })
      .catch(() => setModules([]));
  }, [documentId]);

  useEffect(() => {
    if (!currentModule?.id) return;
    getTutorGreeting(currentModule.id)
      .then(greeting =>
        setTutorMessages([
          {
            role: 'tutor',
            text: greeting,
          },
        ]),
      )
      .catch(() =>
        setTutorMessages([
          {
            role: 'tutor',
            text: `Hi, I'm Sage. Ask me anything about ${currentModule.title}.`,
          },
        ]),
      );
  }, [currentModule?.id]);

  async function askTutor() {
    if (!currentModule?.id || !tutorInput.trim()) return;

    const outgoing: ChatMessage = { role: 'student', text: tutorInput.trim(), timestamp: Date.now() };
    setTutorMessages(current => [...current, outgoing]);
    setTutorInput('');
    setTutorLoading(true);

    try {
      const reply = await sendTutorMessage(currentModule.id, outgoing.text, tutorMessages);
      setTutorMessages(current => [
        ...current,
        {
          role: 'tutor',
          text: reply.reply,
          webSources: reply.webSources,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      Alert.alert('Tutor request failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setTutorLoading(false);
    }
  }

  const lessonHtml = useMemo(() => renderLessonHtml(currentModule), [currentModule]);

  return (
    <Screen>
      <PrimaryButton label="Back to library" onPress={() => router.back()} variant="ghost" />
      <SectionTitle
        eyebrow="Learn"
        title={document?.title || document?.name || 'Document learning workspace'}
        subtitle="Review generated modules, open lesson content in a focused board-like viewer, and ask Sage for help without leaving the lesson flow."
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 0.42, gap: 10 }}>
          {modules.map(module => (
            <PrimaryButton
              key={module.id}
              label={module.title}
              onPress={() => setCurrentModule(module)}
              variant={currentModule?.id === module.id ? 'primary' : 'secondary'}
              icon={BookOpen}
            />
          ))}
        </View>

        <View style={{ flex: 0.58, gap: 12 }}>
          <Card style={{ minHeight: 340, padding: 0, overflow: 'hidden' }}>
            <WebView source={{ html: lessonHtml }} style={{ flex: 1, minHeight: 340 }} />
          </Card>

          <Card>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageSquareText color={colors.primary} size={18} />
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Sage tutor</Text>
              </View>
              {tutorMessages.map((message, index) => (
                <View
                  key={`${message.timestamp || index}-${index}`}
                  style={{
                    backgroundColor: message.role === 'student' ? colors.primarySoft : colors.surfaceMuted,
                    borderRadius: 16,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
                    {message.text}
                  </Text>
                  {message.webSources?.length ? (
                    <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 11 }}>
                      Sources: {message.webSources.map(source => source.title).join(', ')}
                    </Text>
                  ) : null}
                </View>
              ))}
              <TextInput
                value={tutorInput}
                onChangeText={setTutorInput}
                placeholder="Ask Sage to explain, simplify, or test your understanding..."
                placeholderTextColor={colors.textSoft}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 18,
                  minHeight: 88,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  textAlignVertical: 'top',
                  fontFamily: fonts.uiMedium,
                  color: colors.text,
                }}
              />
              <PrimaryButton label={tutorLoading ? 'Thinking...' : 'Ask Sage'} onPress={askTutor} disabled={tutorLoading || !tutorInput.trim()} />
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
