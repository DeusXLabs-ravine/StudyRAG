import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MessageSquareText, Plus, Send, X } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { TopBar } from '@/components/ui/TopBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, fonts, radius, spacing } from '@/lib/theme/tokens';
import {
  getChatHistory,
  listDocuments,
  sendChatQuery,
  type ChatMessage,
  type StudyDocument,
} from '@/services/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatSession = {
  id: string;
  title: string;
  documentId?: string | null;
  messages: ChatMessage[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSession(): ChatSession {
  return { id: `${Date.now()}`, title: 'New chat', messages: [] };
}

function docLabel(doc: StudyDocument): string {
  return doc.title || doc.name || 'Document';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single chat bubble — student (right, blue) or tutor (left, surface). */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isStudent = message.role === 'student';
  return (
    <View
      style={{
        alignSelf: isStudent ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          backgroundColor: isStudent ? colors.primary : colors.surface,
          borderRadius: radius.md,
          borderBottomRightRadius: isStudent ? 4 : radius.md,
          borderBottomLeftRadius: isStudent ? radius.md : 4,
          borderWidth: isStudent ? 0 : 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#0F172A',
          shadowOpacity: isStudent ? 0 : 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: isStudent ? 0 : 2,
        }}
      >
        <Text
          style={{
            color: isStudent ? '#FFFFFF' : colors.text,
            fontFamily: fonts.uiMedium,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {message.text}
        </Text>
        {message.webSources?.length ? (
          <View style={{ marginTop: 6, gap: 2 }}>
            {message.webSources.map((src, i) => (
              <Text
                key={i}
                numberOfLines={1}
                style={{
                  color: isStudent ? 'rgba(255,255,255,0.75)' : colors.textSoft,
                  fontFamily: fonts.uiBold,
                  fontSize: 11,
                }}
              >
                · {src.title}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Ghost "thinking" bubble shown while loading=true. */
function ThinkingBubble() {
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '60%', marginBottom: spacing.sm }}>
      <View
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.md,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: colors.textSoft,
            fontFamily: fonts.uiMedium,
            fontSize: 15,
            fontStyle: 'italic',
          }}
        >
          Thinking…
        </Text>
      </View>
    </View>
  );
}

/** Horizontal pill strip for scoping to a document. */
function DocScopeRow({
  documents,
  selectedDocId,
  onSelect,
}: {
  documents: StudyDocument[];
  selectedDocId: string;
  onSelect: (id: string) => void;
}) {
  const ready = documents.filter(d => d.status === 'ready');
  if (ready.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, paddingVertical: 8 }}
      style={{ borderTopWidth: 1, borderTopColor: colors.border }}
    >
      {/* "All docs" clear option */}
      <Pressable
        onPress={() => onSelect('')}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selectedDocId === '' ? colors.primary : colors.border,
          backgroundColor: selectedDocId === '' ? colors.primarySoft : colors.surface,
        }}
      >
        <Text
          style={{
            color: selectedDocId === '' ? colors.primaryDeep : colors.textMuted,
            fontFamily: fonts.uiBold,
            fontSize: 12,
          }}
        >
          All docs
        </Text>
      </Pressable>

      {ready.map(doc => {
        const active = selectedDocId === doc.id;
        return (
          <Pressable
            key={doc.id}
            onPress={() => onSelect(active ? '' : doc.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primarySoft : colors.surface,
            }}
          >
            <Text
              style={{
                color: active ? colors.primaryDeep : colors.textMuted,
                fontFamily: fonts.uiBold,
                fontSize: 12,
              }}
              numberOfLines={1}
            >
              {docLabel(doc)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Session list item used in both the slide-over panel (phone) and sidebar (tablet). */
function SessionItem({
  session,
  active,
  onPress,
}: {
  session: ChatSession;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={session.title}>
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          borderRadius: radius.sm,
          backgroundColor: active ? colors.primarySoft : 'transparent',
          borderWidth: 1,
          borderColor: active ? colors.primary : 'transparent',
          gap: 2,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: active ? colors.primaryDeep : colors.text,
            fontFamily: fonts.uiBold,
            fontSize: 14,
          }}
        >
          {session.title}
        </Text>
        <Text style={{ color: colors.textSoft, fontFamily: fonts.uiMedium, fontSize: 12 }}>
          {session.messages.length === 0 ? 'No messages' : `${session.messages.length} message${session.messages.length === 1 ? '' : 's'}`}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen — phone layout
// ---------------------------------------------------------------------------

function PhoneChatScreen({
  sessions,
  activeSession,
  documents,
  selectedDocId,
  input,
  loading,
  onSelectSession,
  onNewSession,
  onSelectDoc,
  onChangeInput,
  onSend,
}: {
  sessions: ChatSession[];
  activeSession: ChatSession;
  documents: StudyDocument[];
  selectedDocId: string;
  input: string;
  loading: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onSelectDoc: (id: string) => void;
  onChangeInput: (text: string) => void;
  onSend: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [sessionsPanelOpen, setSessionsPanelOpen] = useState(false);

  // Scroll to bottom whenever messages change.
  useEffect(() => {
    if (activeSession.messages.length > 0) {
      // Small delay so the layout has settled before we scroll.
      const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
  }, [activeSession.messages.length]);

  const newChat = useCallback(() => {
    onNewSession();
    setSessionsPanelOpen(false);
  }, [onNewSession]);

  const selectSession = useCallback(
    (id: string) => {
      onSelectSession(id);
      setSessionsPanelOpen(false);
    },
    [onSelectSession],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <TopBar
            eyebrow="Chat"
            title={activeSession.title === 'New chat' ? 'Ask anything' : activeSession.title}
            right={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Sessions history button */}
                <Pressable
                  onPress={() => setSessionsPanelOpen(v => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="View chat sessions"
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: sessionsPanelOpen
                      ? colors.primarySoft
                      : pressed
                        ? colors.surfaceMuted
                        : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: sessionsPanelOpen ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <MessageSquareText
                    size={17}
                    color={sessionsPanelOpen ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                </Pressable>

                {/* New chat button */}
                <Pressable
                  onPress={newChat}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Start new chat"
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: pressed ? colors.primarySoft : colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
                </Pressable>
              </View>
            }
          />
        </View>

        {/* ── Sessions panel (slide-in overlay) ───────────────────────── */}
        {sessionsPanelOpen && (
          <View
            style={{
              position: 'absolute',
              top: 70,
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              gap: 4,
              shadowColor: '#0F172A',
              shadowOpacity: 0.1,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
              maxHeight: 280,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Sessions
              </Text>
              <Pressable onPress={() => setSessionsPanelOpen(false)} hitSlop={8}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
              {sessions.map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeSession.id}
                  onPress={() => selectSession(session.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Message list ────────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            flexGrow: 1,
            justifyContent: activeSession.messages.length === 0 ? 'center' : 'flex-start',
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {activeSession.messages.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageSquareText color={colors.primary} size={26} strokeWidth={2} />
              </View>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 17, textAlign: 'center' }}>
                Ask a question
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontFamily: fonts.uiMedium,
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 21,
                }}
              >
                Scope your chat to a document using the pills above the input, or ask anything freely.
              </Text>
            </View>
          ) : (
            <>
              {activeSession.messages.map((msg, i) => (
                <MessageBubble key={`${msg.timestamp ?? i}-${i}`} message={msg} />
              ))}
              {loading && <ThinkingBubble />}
            </>
          )}
        </ScrollView>

        {/* ── Doc scope row ────────────────────────────────────────────── */}
        <DocScopeRow documents={documents} selectedDocId={selectedDocId} onSelect={onSelectDoc} />

        {/* ── Input bar ────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 10,
          }}
        >
          <TextInput
            value={input}
            onChangeText={onChangeInput}
            placeholder="Ask about your material…"
            placeholderTextColor={colors.textSoft}
            multiline
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 120,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.sm,
              paddingHorizontal: 14,
              paddingTop: Platform.OS === 'ios' ? 10 : 8,
              paddingBottom: Platform.OS === 'ios' ? 10 : 8,
              fontFamily: fonts.uiMedium,
              fontSize: 15,
              color: colors.text,
              textAlignVertical: 'center',
            }}
            returnKeyType="send"
            enablesReturnKeyAutomatically
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={onSend}
            disabled={loading || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor:
                loading || !input.trim()
                  ? colors.border
                  : pressed
                    ? colors.primaryDeep
                    : colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            })}
          >
            <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main screen — tablet layout (2-column)
// ---------------------------------------------------------------------------

function TabletChatScreen({
  sessions,
  activeSession,
  documents,
  selectedDocId,
  input,
  loading,
  onSelectSession,
  onNewSession,
  onSelectDoc,
  onChangeInput,
  onSend,
}: {
  sessions: ChatSession[];
  activeSession: ChatSession;
  documents: StudyDocument[];
  selectedDocId: string;
  input: string;
  loading: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onSelectDoc: (id: string) => void;
  onChangeInput: (text: string) => void;
  onSend: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (activeSession.messages.length > 0) {
      const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
  }, [activeSession.messages.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Shared top bar */}
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <TopBar
            eyebrow="Chat"
            title={activeSession.title === 'New chat' ? 'Ask anything' : activeSession.title}
          />
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* ── Sidebar ───────────────────────────────────────────── */}
          <View
            style={{
              width: 240,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {/* New session button */}
            <Pressable
              onPress={onNewSession}
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
              style={({ pressed }) => ({
                margin: spacing.md,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: radius.sm,
                backgroundColor: pressed ? colors.primaryDeep : colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              })}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiBold, fontSize: 14 }}>New chat</Text>
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: spacing.sm, gap: 2, paddingBottom: spacing.lg }}>
                {sessions.map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    active={session.id === activeSession.id}
                    onPress={() => onSelectSession(session.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── Chat pane ─────────────────────────────────────────── */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* Message list */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
                flexGrow: 1,
                justifyContent: activeSession.messages.length === 0 ? 'center' : 'flex-start',
              }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
            >
              {activeSession.messages.length === 0 ? (
                <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: spacing.xxl }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: colors.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageSquareText color={colors.primary} size={26} strokeWidth={2} />
                  </View>
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 18, textAlign: 'center' }}>
                    Ask a question
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontFamily: fonts.uiMedium,
                      fontSize: 14,
                      textAlign: 'center',
                      lineHeight: 21,
                    }}
                  >
                    Scope your chat to a document using the pills above the input, or ask anything freely.
                  </Text>
                </View>
              ) : (
                <>
                  {activeSession.messages.map((msg, i) => (
                    <MessageBubble key={`${msg.timestamp ?? i}-${i}`} message={msg} />
                  ))}
                  {loading && <ThinkingBubble />}
                </>
              )}
            </ScrollView>

            {/* Doc scope row */}
            <DocScopeRow documents={documents} selectedDocId={selectedDocId} onSelect={onSelectDoc} />

            {/* Input bar */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <TextInput
                value={input}
                onChangeText={onChangeInput}
                placeholder="Ask about your material…"
                placeholderTextColor={colors.textSoft}
                multiline
                style={{
                  flex: 1,
                  minHeight: 40,
                  maxHeight: 120,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: 14,
                  paddingTop: Platform.OS === 'ios' ? 10 : 8,
                  paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                  fontFamily: fonts.uiMedium,
                  fontSize: 15,
                  color: colors.text,
                  textAlignVertical: 'center',
                }}
                returnKeyType="send"
                enablesReturnKeyAutomatically
                onSubmitEditing={onSend}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={onSend}
                disabled={loading || !input.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor:
                    loading || !input.trim()
                      ? colors.border
                      : pressed
                        ? colors.primaryDeep
                        : colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                })}
              >
                <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Root screen — state owner
// ---------------------------------------------------------------------------

export default function ChatTabScreen() {
  const { isTablet } = useBreakpoint();

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([createSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId],
  );

  // Load documents and any existing chat history on mount.
  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
    getChatHistory()
      .then(history => {
        if (!history.length) return;
        const historySession: ChatSession = { id: 'history', title: 'Recent chat', messages: history };
        setSessions([historySession, createSession()]);
        setActiveSessionId('history');
      })
      .catch(() => undefined);
  }, []);

  const handleNewSession = useCallback(() => {
    const session = createSession();
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput('');
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setInput('');
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Haptic feedback on send.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const outgoing: ChatMessage = { role: 'student', text, timestamp: Date.now() };

    setLoading(true);
    setInput('');

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? {
              ...s,
              title: s.messages.length === 0 ? text.slice(0, 30) : s.title,
              documentId: selectedDocId || s.documentId,
              messages: [...s.messages, outgoing],
            }
          : s,
      ),
    );

    try {
      const reply = await sendChatQuery(text, selectedDocId || undefined);
      const incoming: ChatMessage = {
        role: 'tutor',
        text: reply.answer ?? reply.text ?? 'No response returned.',
        blocks: reply.blocks,
        webSources: reply.webSources,
        timestamp: Date.now(),
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSession.id
            ? { ...s, messages: [...s.messages, incoming] }
            : s,
        ),
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert('Message failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeSession.id, selectedDocId]);

  const sharedProps = {
    sessions,
    activeSession,
    documents,
    selectedDocId,
    input,
    loading,
    onSelectSession: handleSelectSession,
    onNewSession: handleNewSession,
    onSelectDoc: setSelectedDocId,
    onChangeInput: setInput,
    onSend: handleSend,
  };

  if (isTablet) {
    return <TabletChatScreen {...sharedProps} />;
  }

  return <PhoneChatScreen {...sharedProps} />;
}
