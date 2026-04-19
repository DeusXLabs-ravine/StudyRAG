import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  FileUp,
  ImageIcon,
  Link2,
  NotebookPen,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { addNote, addTopic, addUrl, submitScan, uploadDocumentAsset } from '@/services/core';
import { colors, fonts, radius } from '@/lib/theme/tokens';

type Mode = 'menu' | 'url' | 'note' | 'topic' | 'scan';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Fires after a successful add so the caller can refresh its document list */
  onAdded?: () => void;
};

const ACTIONS: Array<{
  key: 'upload' | 'scan' | 'url' | 'note' | 'topic';
  icon: LucideIcon;
  label: string;
  hint: string;
  tint: string;
}> = [
  { key: 'upload', icon: FileUp, label: 'Upload file', hint: 'PDF, DOCX, TXT, Markdown', tint: '#0EA5E9' },
  { key: 'scan', icon: Camera, label: 'Scan document', hint: 'Snap a page — OCR extracts text', tint: '#F97316' },
  { key: 'url', icon: Link2, label: 'Save a link', hint: 'Article, video, web source', tint: '#8B5CF6' },
  { key: 'note', icon: NotebookPen, label: 'Paste a note', hint: 'Type or paste your own text', tint: '#10B981' },
  { key: 'topic', icon: Search, label: 'Research a topic', hint: 'StudyRAG pulls verified sources', tint: '#EF4444' },
];

export function AddDocumentSheet({ visible, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<Mode>('menu');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');

  function resetAndClose() {
    setMode('menu');
    setUrl('');
    setNoteTitle('');
    setNoteContent('');
    setTopicTitle('');
    setTopicDescription('');
    setBusy(false);
    onClose();
  }

  async function handleUpload() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets.length) return;
      const asset = picked.assets[0];

      setBusy(true);
      await uploadDocumentAsset({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      });
      onAdded?.();
      resetAndClose();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleScanCapture(source: 'camera' | 'library') {
    try {
      // Permission dance — camera and media library are separate.
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Camera off',
            'StudyRAG needs camera access to scan pages. Open Settings to allow it?',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo access off', 'Grant photo access to pick a picture to scan.');
          return;
        }
      }

      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              quality: 0.85,
              allowsEditing: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              quality: 0.85,
              allowsEditing: true,
            });
      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      setBusy(true);
      await submitScan({
        uri: asset.uri,
        name: asset.fileName || `scan-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      onAdded?.();
      resetAndClose();
    } catch (e) {
      Alert.alert('Scan failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUrl() {
    if (!url.trim()) return;
    try {
      setBusy(true);
      await addUrl(url.trim());
      onAdded?.();
      resetAndClose();
    } catch (e) {
      Alert.alert('Could not save link', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleNote() {
    if (!noteContent.trim()) return;
    try {
      setBusy(true);
      await addNote(noteTitle.trim() || 'Untitled note', noteContent.trim());
      onAdded?.();
      resetAndClose();
    } catch (e) {
      Alert.alert('Could not save note', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTopic() {
    if (!topicTitle.trim()) return;
    try {
      setBusy(true);
      await addTopic(topicTitle.trim(), topicDescription.trim());
      onAdded?.();
      resetAndClose();
    } catch (e) {
      Alert.alert('Could not research topic', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={resetAndClose} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <View>
              <Text style={{ color: colors.textSoft, fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 1.6 }}>ADD TO LIBRARY</Text>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 22 }}>
                {mode === 'menu'
                  ? 'What are you studying?'
                  : mode === 'url'
                    ? 'Save a link'
                    : mode === 'note'
                      ? 'Paste a note'
                      : mode === 'scan'
                        ? 'Scan a page'
                        : 'Research a topic'}
              </Text>
            </View>
            <Pressable onPress={resetAndClose} hitSlop={10} style={{ padding: 6 }}>
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {mode === 'menu' ? (
              <>
                {ACTIONS.map(action => (
                  <Pressable
                    key={action.key}
                    onPress={() => {
                      if (action.key === 'upload') handleUpload();
                      else if (action.key === 'scan') setMode('scan');
                      else setMode(action.key);
                    }}
                    disabled={busy}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      padding: 14,
                      opacity: busy ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: `${action.tint}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <action.icon color={action.tint} size={20} strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{action.label}</Text>
                      <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 2 }}>
                        {action.hint}
                      </Text>
                    </View>
                  </Pressable>
                ))}

                {busy ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                      Uploading{Platform.OS === 'android' ? '…' : '…'}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : mode === 'scan' ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 19 }}>
                  Take a picture of a page or pick one from your photos. We'll run OCR and file it as a note you
                  can quiz, chat, and flashcard like any other document.
                </Text>
                <PrimaryButton
                  label="Take a photo"
                  icon={Camera}
                  onPress={() => handleScanCapture('camera')}
                  loading={busy}
                  disabled={busy}
                />
                <PrimaryButton
                  label="Choose from photos"
                  icon={ImageIcon}
                  variant="secondary"
                  onPress={() => handleScanCapture('library')}
                  loading={busy}
                  disabled={busy}
                />
                <BackToMenu onPress={() => setMode('menu')} />
              </View>
            ) : mode === 'url' ? (
              <View style={{ gap: 12 }}>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://…"
                  placeholderTextColor={colors.textSoft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={fieldStyle}
                />
                <PrimaryButton label="Save link" onPress={handleUrl} icon={Link2} loading={busy} disabled={!url.trim() || busy} />
                <BackToMenu onPress={() => setMode('menu')} />
              </View>
            ) : mode === 'note' ? (
              <View style={{ gap: 12 }}>
                <TextInput
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  placeholder="Title (optional)"
                  placeholderTextColor={colors.textSoft}
                  style={fieldStyle}
                />
                <TextInput
                  value={noteContent}
                  onChangeText={setNoteContent}
                  placeholder="Paste or type your note…"
                  placeholderTextColor={colors.textSoft}
                  multiline
                  style={[fieldStyle, { minHeight: 140, textAlignVertical: 'top' }]}
                />
                <PrimaryButton label="Save note" onPress={handleNote} icon={NotebookPen} loading={busy} disabled={!noteContent.trim() || busy} />
                <BackToMenu onPress={() => setMode('menu')} />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <TextInput
                  value={topicTitle}
                  onChangeText={setTopicTitle}
                  placeholder="Topic (e.g. Krebs cycle)"
                  placeholderTextColor={colors.textSoft}
                  style={fieldStyle}
                />
                <TextInput
                  value={topicDescription}
                  onChangeText={setTopicDescription}
                  placeholder="What angle should we cover? (optional)"
                  placeholderTextColor={colors.textSoft}
                  multiline
                  style={[fieldStyle, { minHeight: 100, textAlignVertical: 'top' }]}
                />
                <PrimaryButton label="Start research" onPress={handleTopic} icon={Sparkles} loading={busy} disabled={!topicTitle.trim() || busy} />
                <BackToMenu onPress={() => setMode('menu')} />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function BackToMenu({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', padding: 8 }}>
      <Text style={{ color: colors.textMuted, fontFamily: fonts.uiBold, fontSize: 13 }}>← Back to options</Text>
    </Pressable>
  );
}

const fieldStyle = {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: fonts.uiMedium,
  fontSize: 15,
  color: colors.text,
} as const;
