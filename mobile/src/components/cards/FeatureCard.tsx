import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { colors, fonts } from '@/lib/theme/tokens';

export function FeatureCard({
  icon: Icon,
  title,
  subtitle,
  onPress,
  tone = 'primary',
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  tone?: 'primary' | 'purple' | 'ink';
}) {
  const toneMap = {
    primary: { backgroundColor: colors.primarySoft, color: colors.primaryDeep },
    purple: { backgroundColor: colors.purpleSoft, color: colors.purple },
    ink: { backgroundColor: '#ECFDF5', color: colors.success },
  } as const;

  const palette = toneMap[tone];

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: palette.backgroundColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color={palette.color} size={20} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 16 }}>{title}</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20 }}>
              {subtitle}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
