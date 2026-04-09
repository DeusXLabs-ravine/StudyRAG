import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MessageSquareText, Plus, SendHorizonal } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getChatHistory, listDocuments, sendChatQuery, type ChatMessage, type StudyDocument } from '@/services/core';
import { colors, fonts, radius } from '@/lib/theme/tokens';

type ChatSession = {
  id: string;
  title: string;
  documentId?: string | null;
  messages: ChatMessage[];
};

function createSession(): ChatSession {
  return {
    id: `${Date.now()}`,
    title: 'New chat',
    messages: [],
  };
}

export default function ChatTabScreen() {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([createSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeSession = useMemo(
    () => sessions.find(session => session.id === activeSessionId) || sessions[0],
    [activeSessionId, sessions],
  );

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
    getChatHistory()
      .then(history => {
        if (!history.length) return;
        setSessions([{ id: 'history', title: 'Recent chat', messages: history }]);
        setActiveSessionId('history');
      })
      .catch(() => undefined);
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    const outgoing: ChatMessage = {
      role: 'student',
      text: input.trim(),
      timestamp: Date.now(),
    };

    setLoading(true);
    setInput('');
    setSessions(current =>
      current.map(session =>
        session.id === activeSession.id
          ? {
              ...session,
              title: session.messages.length === 0 ? outgoing.text.slice(0, 24) : session.title,
              documentId: selectedDocId || session.documentId,
              messages: [...session.messages, outgoing],
            }
          : session,
      ),
    );

    try {
      const reply = await sendChatQuery(outgoing.text, selectedDocId || undefined);
      const incoming: ChatMessage = {
        role: 'tutor',
        text: reply.answer || reply.text || 'No response returned.',
        blocks: reply.blocks,
        webSources: reply.webSources,
        timestamp: Date.now(),
      };

      setSessions(current =>
        current.map(session =>
          session.id === activeSession.id
            ? {
                ...session,
                messages: [...session.messages, incoming],
              }
            : session,
        ),
      );
    } catch (error) {
      Alert.alert('Chat failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SectionTitle
        eyebrow="Chat"
        title="Ask grounded questions."
        subtitle="Messages stay document-aware when you scope chat to one of your ready uploads."
      />

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <PrimaryButton
            label="New chat"
            onPress={() => {
              const session = createSession();
              setSessions(current => [session, ...current]);
              setActiveSessionId(session.id);
            }}
            icon={Plus}
            variant="secondary"
          />
          {documents
            .filter(item => item.status === 'ready')
            .slice(0, 6)
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
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 0.42, gap: 10 }}>
          {sessions.map(session => (
            <Pressable key={session.id} onPress={() => setActiveSessionId(session.id)}>
              <Card style={{ borderColor: activeSessionId === session.id ? colors.primary : colors.border }}>
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 14 }}>{session.title}</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                  {session.messages.length} message(s)
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 0.58, gap: 12 }}>
          <Card style={{ minHeight: 280 }}>
            <View style={{ gap: 12 }}>
              {activeSession.messages.length === 0 ? (
                <View style={{ gap: 10 }}>
                  <MessageSquareText color={colors.textSoft} size={22} />
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
                    Start with a source-grounded question and StudyRAG will answer against the material you uploaded.
                  </Text>
                </View>
              ) : (
                activeSession.messages.map((message, index) => (
                  <View
                    key={`${message.timestamp || index}-${index}`}
                    style={{
                      alignSelf: message.role === 'student' ? 'flex-end' : 'stretch',
                      backgroundColor: message.role === 'student' ? colors.primarySoft : colors.surfaceMuted,
                      borderRadius: 18,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: colors.text, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
                      {message.text}
                    </Text>
                    {message.webSources?.length ? (
                      <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBold, fontSize: 11 }}>
                        Web sources: {message.webSources.map(source => source.title).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </Card>

          <Card>
            <View style={{ gap: 10 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your document, request a summary, or compare concepts..."
                placeholderTextColor={colors.textSoft}
                multiline
                style={{
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  textAlignVertical: 'top',
                  fontFamily: fonts.uiMedium,
                  color: colors.text,
                }}
              />
              <PrimaryButton label={loading ? 'Thinking...' : 'Send'} onPress={sendMessage} icon={SendHorizonal} disabled={loading || !input.trim()} />
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
