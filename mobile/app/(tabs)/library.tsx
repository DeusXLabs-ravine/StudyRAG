import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { BadgePlus, FileUp, Link2, NotebookPen, Search } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import {
  addNote,
  addTopic,
  addUrl,
  listDocuments,
  togglePrimarySource,
  uploadDocumentAsset,
  type StudyDocument,
} from '@/services/core';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function LibraryTabScreen() {
  const profile = useAuthStore(state => state.profile);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const nextDocuments = await listDocuments();
    setDocuments(nextDocuments);
  }

  useEffect(() => {
    refresh().catch(() => setDocuments([]));
  }, []);

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
      await refresh();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitUrl() {
    try {
      setBusy(true);
      await addUrl(urlInput.trim());
      setUrlInput('');
      await refresh();
    } catch (error) {
      Alert.alert('Could not add URL', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    try {
      setBusy(true);
      await addNote(noteTitle.trim(), noteContent.trim());
      setNoteTitle('');
      setNoteContent('');
      await refresh();
    } catch (error) {
      Alert.alert('Could not add note', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitTopic() {
    try {
      setBusy(true);
      await addTopic(topicTitle.trim(), topicDescription.trim());
      setTopicTitle('');
      setTopicDescription('');
      await refresh();
    } catch (error) {
      Alert.alert('Could not add topic', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <SectionTitle
        eyebrow="Library"
        title="Your study materials live here."
        subtitle={`Document usage: ${profile?.document_count || 0} uploaded. Bring in files, URLs, notes, and topic research just like the web app.`}
      />

      <PrimaryButton label={busy ? 'Working...' : 'Upload file'} onPress={handleUpload} icon={FileUp} disabled={busy} />

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Add a URL</Text>
          <TextInput
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="https://..."
            placeholderTextColor={colors.textSoft}
            style={fieldStyle}
          />
          <PrimaryButton label="Save URL" onPress={submitUrl} icon={Link2} disabled={!urlInput.trim() || busy} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Add notes</Text>
          <TextInput value={noteTitle} onChangeText={setNoteTitle} placeholder="Note title" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <TextInput
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder="Paste or type your note content"
            placeholderTextColor={colors.textSoft}
            multiline
            style={[fieldStyle, { minHeight: 110, textAlignVertical: 'top' }]}
          />
          <PrimaryButton label="Save note" onPress={submitNote} icon={NotebookPen} disabled={!noteContent.trim() || busy} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Research a topic</Text>
          <TextInput value={topicTitle} onChangeText={setTopicTitle} placeholder="Topic" placeholderTextColor={colors.textSoft} style={fieldStyle} />
          <TextInput
            value={topicDescription}
            onChangeText={setTopicDescription}
            placeholder="What angle should StudyRAG explore?"
            placeholderTextColor={colors.textSoft}
            multiline
            style={[fieldStyle, { minHeight: 94, textAlignVertical: 'top' }]}
          />
          <PrimaryButton label="Start topic research" onPress={submitTopic} icon={Search} disabled={!topicTitle.trim() || busy} />
        </View>
      </Card>

      <SectionTitle eyebrow="Documents" title="Ready to learn" subtitle="Tap a ready document to open its module list." />
      {documents.map(document => (
        <Pressable
          key={document.id}
          onPress={() => document.status === 'ready' && router.push(`/learn/${document.id}`)}
        >
          <Card>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>
                    {document.title || document.name || 'Untitled document'}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                    {document.source_type || 'file'} • {document.status}
                  </Text>
                </View>
                <PrimaryButton
                  label={document.primary_source ? 'Primary' : 'Set primary'}
                  onPress={() =>
                    togglePrimarySource(document.id, !document.primary_source)
                      .then(refresh)
                      .catch(error => Alert.alert('Could not update source', error.message))
                  }
                  variant="secondary"
                  icon={BadgePlus}
                />
              </View>
              {document.status === 'ready' ? (
                <Text style={{ color: colors.primaryDeep, fontFamily: fonts.uiBold, fontSize: 13 }}>
                  Open Learn for modules, tutor guidance, and quiz generation.
                </Text>
              ) : (
                <Text style={{ color: colors.warning, fontFamily: fonts.uiBold, fontSize: 13 }}>
                  Still processing. Modules will appear once the backend finishes ingesting it.
                </Text>
              )}
            </View>
          </Card>
        </Pressable>
      ))}
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
  fontSize: 14,
  color: colors.text,
} as const;
