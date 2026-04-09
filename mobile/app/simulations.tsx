import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { listDocuments } from '@/services/core';
import { generateSimulationParams, getSimulationCatalog } from '@/services/practice';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function SimulationsScreen() {
  const profile = useAuthStore(state => state.profile);
  const canUseSimulations = profile?.feature_access?.canUseSimulations || profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'max';
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; title?: string; name?: string; status: string }>>([]);
  const [query, setQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [generatedParams, setGeneratedParams] = useState<unknown>(null);

  useEffect(() => {
    getSimulationCatalog().then(setCatalog).catch(() => setCatalog([]));
    listDocuments().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  async function generateParams() {
    try {
      const nextParams = await generateSimulationParams(query.trim(), undefined, selectedDocId || undefined);
      setGeneratedParams(nextParams);
    } catch (error) {
      Alert.alert('Simulation generation failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <Screen>
      <PrimaryButton label="Back" onPress={() => router.back()} variant="ghost" />
      <SectionTitle
        eyebrow="Simulations"
        title="Premium simulation catalog and parameter generation."
        subtitle="The mobile app keeps simulations discoverable natively, then hands off rich simulation parameters to the premium backend flow."
      />

      {!canUseSimulations ? (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Text style={{ color: colors.warning, fontFamily: fonts.uiBold, fontSize: 15 }}>
            Your current tier does not include simulations. Upgrade to Pro or Max to unlock this surface.
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Upgrade" onPress={() => router.push('/upgrade')} />
          </View>
        </Card>
      ) : null}

      {catalog.map(item => (
        <Card key={item.id}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBlack, fontSize: 18 }}>{item.title}</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
            {item.description}
          </Text>
        </Card>
      ))}

      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Generate custom params</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Describe the simulation you want..."
            placeholderTextColor={colors.textSoft}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              minHeight: 96,
              paddingHorizontal: 16,
              paddingVertical: 14,
              textAlignVertical: 'top',
              fontFamily: fonts.uiMedium,
              color: colors.text,
            }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {documents
              .filter(document => document.status === 'ready')
              .slice(0, 6)
              .map(document => (
                <PrimaryButton
                  key={document.id}
                  label={document.title || document.name || 'Document'}
                  onPress={() => setSelectedDocId(document.id)}
                  variant={selectedDocId === document.id ? 'primary' : 'secondary'}
                />
              ))}
          </View>
          <PrimaryButton label="Generate parameters" onPress={generateParams} disabled={!query.trim() || !canUseSimulations} />
        </View>
      </Card>

      {generatedParams ? (
        <Card>
          <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>Generated parameter payload</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
            {JSON.stringify(generatedParams, null, 2)}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
