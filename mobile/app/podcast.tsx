import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getPodcastSections, listDocuments } from '@/services/core';
import { colors, fonts } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function PodcastScreen() {
  const profile = useAuthStore(state => state.profile);
  const canPodcast = profile?.feature_access?.canPodcast || profile?.subscription_tier === 'max';
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [sections, setSections] = useState<
    Array<{ sectionIndex: number; heading: string; audioUrl?: string; transcript?: string; status?: string }>
  >([]);

  const player = useAudioPlayer(null);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
    return () => {
      player.remove();
    };
  }, []);

  async function loadSections(documentId: string) {
    try {
      setSelectedDocId(documentId);
      const nextSections = await getPodcastSections(documentId);
      setSections(nextSections);
    } catch (error) {
      Alert.alert('Could not load podcasts', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function playSection(url?: string) {
    if (!url) {
      Alert.alert('Audio not ready', 'That section does not have an audio URL yet.');
      return;
    }

    try {
      player.replace({ uri: url });
      player.play();
    } catch (error) {
      Alert.alert('Playback failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle
        eyebrow="Podcast"
        title="Section podcasts for revision on the go."
        subtitle="Mobile keeps the audio study flow simple: load a document, browse section podcasts, and play what is already available."
      />

      {!canPodcast ? (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Text style={{ color: colors.warning, fontFamily: fonts.uiBold, fontSize: 15 }}>
            Podcasts are part of the Max tier. Upgrade to unlock audio-first study revision.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Upgrade" onPress={() => router.push('/upgrade')} />
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Choose a document</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(document => document.status === 'ready')
              .map(document => (
                <PrimaryButton
                  key={document.id}
                  label={document.title || document.name || 'Document'}
                  onPress={() => loadSections(document.id)}
                  variant={selectedDocId === document.id ? 'primary' : 'secondary'}
                />
              ))}
          </View>
        </View>
      </Card>

      {sections.map(section => (
        <Card key={`${section.sectionIndex}-${section.heading}`}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>{section.heading}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
            Status: {section.status || (section.audioUrl ? 'ready' : 'processing')}
          </Text>
          {section.transcript ? (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
              {section.transcript.slice(0, 220)}...
            </Text>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Play section" onPress={() => playSection(section.audioUrl)} disabled={!canPodcast} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
