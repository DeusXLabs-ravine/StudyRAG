import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { HeroBackdrop } from '@/components/ui/HeroBackdrop';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StepDots } from '@/components/ui/StepDots';
import { colors, fonts, radius } from '@/lib/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

const teachingLevels: { key: string; label: string; hint: string }[] = [
  { key: 'dummy', label: 'Explain like I\'m five', hint: 'Plain-English, lots of analogies' },
  { key: 'beginner', label: 'Beginner', hint: 'Foundational, with gentle depth' },
  { key: 'intermediate', label: 'Intermediate', hint: 'Balanced, with real terminology' },
  { key: 'advanced', label: 'Advanced', hint: 'Rigorous, minimal hand-holding' },
];

const accessibilityFlags = [
  { label: 'Dyslexia support', hint: 'Dyslexia-friendly font + spacing', key: 'a11y_dyslexia_mode' },
  { label: 'Focus mode / ADHD', hint: 'Strip the UI to the task at hand', key: 'a11y_adhd_focus_mode' },
  { label: 'High contrast / larger text', hint: 'Boost contrast and type scale', key: 'a11y_high_contrast' },
  { label: 'Voice input', hint: 'Prefer voice for tutor questions', key: 'a11y_voice_input' },
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
  const isLast = step === totalSteps - 1;
  const canAdvance = useMemo(() => {
    if (step === 0) return displayName.trim().length > 0;
    if (step === 1) return age.trim().length > 0;
    return true;
  }, [step, displayName, age]);

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
      router.replace('/(tabs)');

      if (a11ySelections.length > 0) {
        // These preferences are non-blocking; save in the background so the
        // user can enter the app immediately after profile creation.
        void Promise.allSettled(a11ySelections.map(key => setSetting(key, 'true')));
      }
    } catch (error) {
      Alert.alert('Could not finish onboarding', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <HeroBackdrop variant="ocean" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <StepDots total={totalSteps} current={step} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, gap: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle
            eyebrow={`Step ${step + 1} of ${totalSteps}`}
            title={
              step === 0 ? 'What should we call you?'
              : step === 1 ? 'How old are you?'
              : step === 2 ? 'Pick your teaching depth'
              : step === 3 ? 'What are you studying?'
              : 'Accessibility defaults'
            }
            subtitle={
              step === 0 ? 'This is how your tutor will greet you across the app.'
              : step === 1 ? 'Helps the tutor pick analogies and pacing that land.'
              : step === 2 ? 'You can always change this per subject later.'
              : step === 3 ? 'Topics and interests sharpen every explanation.'
              : 'Turn on anything that makes studying easier for you.'
            }
          />

          <Card>
            {step === 0 ? (
              <Field
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Daniel"
                autoCapitalize="words"
              />
            ) : null}

            {step === 1 ? (
              <Field
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="22"
                keyboardType="number-pad"
              />
            ) : null}

            {step === 2 ? (
              <View style={{ gap: 10 }}>
                {teachingLevels.map(level => {
                  const selected = teachingLevel === level.key;
                  return (
                    <ChoiceRow
                      key={level.key}
                      title={level.label}
                      hint={level.hint}
                      selected={selected}
                      onPress={() => setTeachingLevel(level.key)}
                    />
                  );
                })}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={{ gap: 14 }}>
                <Field
                  label="Subjects or fields"
                  value={academicFields}
                  onChangeText={setAcademicFields}
                  placeholder="Medicine, Computer Science, Physics"
                  multiline
                  minHeight={96}
                />
                <Field
                  label="Interests (for better analogies)"
                  value={interests}
                  onChangeText={setInterests}
                  placeholder="Football, music production, chess"
                  multiline
                  minHeight={80}
                />
              </View>
            ) : null}

            {step === 4 ? (
              <View style={{ gap: 10 }}>
                {accessibilityFlags.map(item => {
                  const selected = a11ySelections.includes(item.key);
                  return (
                    <ChoiceRow
                      key={item.key}
                      title={item.label}
                      hint={item.hint}
                      selected={selected}
                      onPress={() =>
                        setA11ySelections(current =>
                          selected ? current.filter(entry => entry !== item.key) : [...current, item.key],
                        )
                      }
                    />
                  );
                })}
              </View>
            ) : null}
          </Card>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 10,
            }}
          >
            {step > 0 ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Back"
                  onPress={() => setStep(step - 1)}
                  variant="secondary"
                  icon={ArrowLeft}
                />
              </View>
            ) : null}
            <View style={{ flex: step > 0 ? 2 : 1 }}>
              {isLast ? (
                <PrimaryButton
                  label={saving ? 'Saving...' : 'Finish setup'}
                  onPress={finish}
                  loading={saving}
                  icon={Check}
                  iconPosition="trailing"
                  disabled={saving}
                />
              ) : (
                <PrimaryButton
                  label="Next"
                  onPress={() => setStep(step + 1)}
                  icon={ArrowRight}
                  iconPosition="trailing"
                  disabled={!canAdvance}
                />
              )}
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  minHeight,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  multiline?: boolean;
  minHeight?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: fonts.uiBlack,
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          paddingVertical: 14,
          minHeight: minHeight ?? 52,
          textAlignVertical: multiline ? 'top' : 'center',
          fontFamily: fonts.uiMedium,
          fontSize: 15,
          color: colors.text,
          backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  );
}

function ChoiceRow({
  title,
  hint,
  selected,
  onPress,
}: {
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: selected ? colors.primarySoft : '#FFFFFF',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: selected ? colors.primary : '#CBD5E1',
          backgroundColor: selected ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 13, marginTop: 2 }}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}
