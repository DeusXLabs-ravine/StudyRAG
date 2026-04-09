import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

const teachingLevels = ['dummy', 'beginner', 'intermediate', 'advanced'];
const accessibilityFlags = [
  { label: 'Dyslexia support', key: 'a11y_dyslexia_mode' },
  { label: 'Focus mode / ADHD', key: 'a11y_adhd_focus_mode' },
  { label: 'High contrast / larger text', key: 'a11y_high_contrast' },
  { label: 'Voice input', key: 'a11y_voice_input' },
];

export default function ProfileOnboardingScreen() {
  const completeProfileOnboarding = useAuthStore(state => state.completeProfileOnboarding);
  const setSetting = useSettingsStore(state => state.setSetting);

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('intermediate');
  const [interests, setInterests] = useState('');
  const [academicFields, setAcademicFields] = useState('');
  const [a11ySelections, setA11ySelections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;
  const progress = useMemo(() => (step + 1) / totalSteps, [step]);

  async function finish() {
    try {
      setSaving(true);
      await completeProfileOnboarding({
        displayName,
        age: age ? Number(age) : undefined,
        teachingLevel,
        interests: interests
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        academicFields: academicFields
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      });

      await Promise.all(a11ySelections.map(key => setSetting(key, 'true')));
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not finish onboarding', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SectionTitle
        eyebrow="Profile Setup"
        title="Tune StudyRAG to how you learn."
        subtitle="This keeps the mobile app consistent with the web experience, while making the setup flow feel native and touch-friendly."
      />

      <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 999 }}>
        <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: colors.primary, borderRadius: 999 }} />
      </View>

      <Card>
        {step === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 20 }}>What should we call you?</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={colors.textSoft}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.uiMedium,
                color: colors.text,
              }}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 20 }}>How old are you?</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="Age"
              placeholderTextColor={colors.textSoft}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.uiMedium,
                color: colors.text,
              }}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 20 }}>Choose your teaching depth</Text>
            {teachingLevels.map(level => (
              <Pressable
                key={level}
                onPress={() => setTeachingLevel(level)}
                style={{
                  borderWidth: 1,
                  borderColor: teachingLevel === level ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  padding: 14,
                  backgroundColor: teachingLevel === level ? colors.primarySoft : '#FFFFFF',
                }}
              >
                <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{level}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 20 }}>What are you studying?</Text>
            <TextInput
              value={academicFields}
              onChangeText={setAcademicFields}
              placeholder="Medicine, Computer Science, Physics..."
              placeholderTextColor={colors.textSoft}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 108,
                textAlignVertical: 'top',
                fontFamily: fonts.uiMedium,
                color: colors.text,
              }}
            />
            <TextInput
              value={interests}
              onChangeText={setInterests}
              placeholder="Interests or hobbies for better analogies"
              placeholderTextColor={colors.textSoft}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 96,
                textAlignVertical: 'top',
                fontFamily: fonts.uiMedium,
                color: colors.text,
              }}
            />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 20 }}>
              Pick any accessibility defaults
            </Text>
            {accessibilityFlags.map(item => {
              const selected = a11ySelections.includes(item.key);
              return (
                <Pressable
                  key={item.key}
                  onPress={() =>
                    setA11ySelections(current =>
                      selected ? current.filter(entry => entry !== item.key) : [...current, item.key],
                    )
                  }
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    padding: 14,
                    backgroundColor: selected ? colors.primarySoft : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {step > 0 ? <PrimaryButton label="Back" onPress={() => setStep(step - 1)} variant="secondary" /> : null}
        {step < totalSteps - 1 ? (
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Next" onPress={() => setStep(step + 1)} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <PrimaryButton label={saving ? 'Saving...' : 'Finish setup'} onPress={finish} disabled={saving} />
          </View>
        )}
      </View>
    </Screen>
  );
}
