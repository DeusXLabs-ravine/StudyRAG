import React, { useState, useRef, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, X, BookOpen, Zap } from 'lucide-react-native';
import { useAudioRecorder, AudioModule } from 'expo-audio';
import { supabase } from '@/lib/auth/supabase';
import { env } from '@/lib/env';
import { colors, fonts, spacing, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type WsStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'ended';

type LightningQuestion = {
  question: string;
  answer: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type LightningRound = {
  topic: string;
  questions: LightningQuestion[];
};

type DiagramResult = {
  title?: string;
  explanation?: string;
  mermaidCode?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWsUrl(token: string): string {
  // https://api.studyrag.co/api → wss://api.studyrag.co/ws/teach
  const base = env.apiBaseUrl
    .replace(/\/api\/?$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http(?!s)/, 'ws');
  return `${base}/ws/teach?token=${encodeURIComponent(token)}`;
}

function buildTeachingInstruction(userName: string, teachingLevel: string): string {
  const levelGuide: Record<string, string> = {
    dummy: 'everyday language, zero jargon — explain like to a curious 8-year-old',
    beginner: 'clear definitions, simple examples, define every term on first use',
    intermediate: 'standard academic language, balanced depth',
    advanced: 'technical and rigorous — edge cases, nuances, theoretical depth',
  };
  return `You are Sage, a world-class live AI tutor conducting a real-time audio teaching session on mobile.

STUDENT: ${userName} | LEVEL: ${teachingLevel} (${levelGuide[teachingLevel] || levelGuide.intermediate})

TEACHING RULES:
- You are speaking live — keep sentences short and natural, as a real teacher would speak
- Use render_diagram for any process, hierarchy, cycle, or relationship — constantly
- For abstract ideas and mental models, call generate_illustration
- For real-time facts or to verify information, call search_external_knowledge
- End each section with a check-in question before moving on
- Use the student's name (${userName}) occasionally for personal connection

Start with a warm greeting using the student's name, share one surprising fact to hook attention, then ask what topic they'd like to explore.`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

const RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  ios: {
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16 as 8 | 16 | 24 | 32,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  web: {},
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeachScreen() {
  const profile = useAuthStore(state => state.profile);
  const canTeach =
    profile?.feature_access?.canTeach ||
    profile?.subscription_tier === 'pro' ||
    profile?.subscription_tier === 'max';

  const [wsStatus, setWsStatus] = useState<WsStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [diagram, setDiagram] = useState<DiagramResult | null>(null);
  const [lightning, setLightning] = useState<LightningRound | null>(null);
  const [lrIndex, setLrIndex] = useState(0);
  const [lrRevealed, setLrRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);

  // ── Permissions ───────────────────────────────────────────────────────────

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync()
      .then(status => setMicPermission(status.granted))
      .catch(() => {});
  }, []);

  // ── Pulse animation ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      wsRef.current?.close();
    };
  }, []);

  // ── Recording loop (250ms chunks) ─────────────────────────────────────────

  const startRecordingLoop = useCallback(async () => {
    if (!micPermission || isRecordingRef.current) return;
    isRecordingRef.current = true;
    setIsRecording(true);

    const loop = async () => {
      while (isRecordingRef.current) {
        try {
          await audioRecorder.prepareToRecordAsync(RECORDING_OPTIONS);
          audioRecorder.record();

          await new Promise<void>(r => setTimeout(r, 250));

          if (!isRecordingRef.current) {
            await audioRecorder.stop();
            break;
          }

          await audioRecorder.stop();
          const uri = audioRecorder.uri;

          if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = arrayBufferToBase64(arrayBuffer);
            wsRef.current.send(
              JSON.stringify({ type: 'audio', data: base64, mimeType: 'audio/wav' }),
            );
          }
        } catch (err) {
          console.warn('[Teach] Recording chunk error:', err);
          break;
        }
      }
      setIsRecording(false);
    };

    loop();
  }, [audioRecorder, micPermission]);

  const stopRecordingLoop = useCallback(() => {
    isRecordingRef.current = false;
  }, []);

  // ── Message handler ───────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (msg: Record<string, unknown>) => {
      switch (msg.type) {
        case 'ready':
          setWsStatus('ready');
          startRecordingLoop();
          break;
        case 'transcript':
          setTranscript(prev => prev + String(msg.text ?? ''));
          setTimeout(() => transcriptScrollRef.current?.scrollToEnd({ animated: true }), 80);
          break;
        case 'user_transcript':
          setUserTranscript(prev => (prev ? `${prev} ${msg.text}` : String(msg.text ?? '')));
          break;
        case 'tool_result': {
          const name = msg.name as string;
          const result = msg.result as Record<string, unknown>;
          if (name === 'start_lightning_round' && result?.questions) {
            setLightning(result as unknown as LightningRound);
            setLrIndex(0);
            setLrRevealed(false);
          } else if (name === 'render_diagram') {
            setDiagram(result as DiagramResult);
          }
          break;
        }
        case 'interrupted':
          // Sage was interrupted mid-speech — no UI change needed
          break;
        case 'error':
          setError(String(msg.message ?? 'An error occurred'));
          break;
        case 'ended':
          setWsStatus('ended');
          stopRecordingLoop();
          break;
      }
    },
    [startRecordingLoop, stopRecordingLoop],
  );

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setError('Not authenticated. Please sign in and try again.');
      return;
    }

    setWsStatus('connecting');
    setTranscript('');
    setUserTranscript('');
    setError(null);
    setDiagram(null);
    setLightning(null);

    const ws = new WebSocket(getWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      const userName = profile?.displayName || 'friend';
      const teachingLevel = profile?.teachingLevel || 'intermediate';
      ws.send(
        JSON.stringify({
          type: 'init',
          systemInstruction: buildTeachingInstruction(userName, teachingLevel),
          toolContext: {},
        }),
      );
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as Record<string, unknown>;
        handleMessage(msg);
      } catch {}
    };

    ws.onerror = () => {
      setError('Connection failed. Check your connection and try again.');
      setWsStatus('error');
      stopRecordingLoop();
    };

    ws.onclose = () => {
      stopRecordingLoop();
    };
  }, [profile, handleMessage, stopRecordingLoop]);

  const disconnect = useCallback(() => {
    stopRecordingLoop();
    wsRef.current?.close();
    wsRef.current = null;
    setWsStatus('idle');
    setIsRecording(false);
  }, [stopRecordingLoop]);

  // ── Premium gate ──────────────────────────────────────────────────────────

  if (!canTeach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md }}>
        <PrimaryButton label="Close" onPress={() => router.back()} variant="ghost" />
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Text style={{ color: colors.warning, fontFamily: fonts.uiBold, fontSize: 15 }}>
            Teach mode is available on Pro and Max plans.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Upgrade" onPress={() => router.push('/upgrade')} />
          </View>
        </Card>
      </SafeAreaView>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  const isConnected = wsStatus === 'ready';
  const isConnecting = wsStatus === 'connecting';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { disconnect(); router.back(); }} hitSlop={8}>
          <X size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sage</Text>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isConnected
                  ? colors.success
                  : isConnecting
                    ? colors.warning
                    : colors.textSoft,
              },
            ]}
          />
        </View>

        {isConnected ? (
          <TouchableOpacity onPress={disconnect} hitSlop={8}>
            <Text style={styles.endLabel}>End</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* ── Chalkboard ── */}
      <View style={styles.board}>
        <View style={styles.boardTopRow}>
          <BookOpen size={13} color={colors.chalk} style={{ opacity: 0.5 }} />
          <Text style={styles.boardLabel}>LIVE SESSION</Text>
        </View>

        <ScrollView
          ref={transcriptScrollRef}
          style={styles.transcriptScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {transcript ? (
            <Text style={styles.transcriptText}>{transcript}</Text>
          ) : (
            <Text style={styles.transcriptPlaceholder}>
              {isConnecting
                ? 'Connecting to Sage...'
                : isConnected
                  ? 'Sage is listening...'
                  : 'Tap Connect to start your live session with Sage.'}
            </Text>
          )}
        </ScrollView>

        {/* Recording indicator inside board */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Animated.View
              style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]}
            />
            <Text style={styles.recordingLabel}>Listening</Text>
          </View>
        )}
      </View>

      {/* ── Tool results ── */}
      {diagram && (
        <Card style={styles.diagramCard}>
          <Text style={styles.diagramTitle}>📊 {diagram.title || 'Diagram'}</Text>
          {diagram.explanation ? (
            <Text style={styles.diagramExplanation}>{diagram.explanation}</Text>
          ) : null}
        </Card>
      )}

      {lightning && (
        <Card style={styles.lightningCard}>
          <View style={styles.lightningHeader}>
            <Zap size={14} color={colors.purple} />
            <Text style={styles.lightningTitle}>Lightning Round: {lightning.topic}</Text>
          </View>

          {lightning.questions[lrIndex] && (
            <View style={{ gap: 10 }}>
              <Text style={styles.lightningProgress}>
                {lrIndex + 1} / {lightning.questions.length}
              </Text>
              <Text style={styles.lightningQuestion}>{lightning.questions[lrIndex].question}</Text>

              {lrRevealed ? (
                <Text style={styles.lightningAnswer}>
                  ✓ {lightning.questions[lrIndex].answer}
                </Text>
              ) : (
                <PrimaryButton label="Reveal Answer" onPress={() => setLrRevealed(true)} />
              )}

              {lrRevealed && lrIndex < lightning.questions.length - 1 && (
                <PrimaryButton
                  label="Next Question →"
                  onPress={() => { setLrIndex(i => i + 1); setLrRevealed(false); }}
                  variant="secondary"
                />
              )}
            </View>
          )}
        </Card>
      )}

      {/* ── User transcript ── */}
      {userTranscript ? (
        <View style={styles.userRow}>
          <Text style={styles.userLabel}>You: </Text>
          <Text style={styles.userText} numberOfLines={2}>{userTranscript}</Text>
        </View>
      ) : null}

      {/* ── Error ── */}
      {error ? (
        <Card style={{ backgroundColor: colors.dangerSoft, marginBottom: spacing.sm }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.uiMedium, fontSize: 13 }}>
            {error}
          </Text>
        </Card>
      ) : null}

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {!isConnected && !isConnecting && (
          <PrimaryButton label="Connect to Sage" onPress={connect} />
        )}

        {isConnecting && (
          <Text style={styles.connectingLabel}>Starting session…</Text>
        )}

        {isConnected && (
          <View style={styles.micArea}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonActive]}
                onPress={isRecording ? stopRecordingLoop : startRecordingLoop}
                activeOpacity={0.8}
              >
                {isRecording ? (
                  <MicOff size={30} color="#fff" />
                ) : (
                  <Mic size={30} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.micHint}>
              {isRecording ? 'Recording — tap to pause' : 'Tap to speak'}
            </Text>
          </View>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 17,
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  endLabel: {
    color: colors.danger,
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
  },

  // Board
  board: {
    backgroundColor: colors.inkBoard,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 220,
    maxHeight: 300,
    borderWidth: 2,
    borderColor: '#2D5242',
    marginBottom: spacing.md,
    position: 'relative',
  },
  boardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  boardLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    color: colors.chalk,
    letterSpacing: 1.5,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptText: {
    fontFamily: fonts.handwritten,
    fontSize: 18,
    color: colors.chalk,
    lineHeight: 30,
  },
  transcriptPlaceholder: {
    fontFamily: fonts.handwritten,
    fontSize: 16,
    color: colors.chalk,
    opacity: 0.35,
    lineHeight: 26,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.danger,
  },
  recordingLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: colors.chalk,
    opacity: 0.7,
  },

  // Diagram
  diagramCard: {
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  diagramTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  diagramExplanation: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // Lightning round
  lightningCard: {
    backgroundColor: colors.purpleSoft,
    borderColor: colors.purple,
    marginBottom: spacing.sm,
  },
  lightningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  lightningTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.purple,
  },
  lightningProgress: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: colors.purple,
    opacity: 0.7,
  },
  lightningQuestion: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  lightningAnswer: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.success,
    lineHeight: 22,
  },

  // User transcript
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    marginBottom: spacing.sm,
  },
  userLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.primary,
  },
  userText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 20,
  },

  // Controls
  controls: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  connectingLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  micArea: {
    alignItems: 'center',
    gap: 10,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  micButtonActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  micHint: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
