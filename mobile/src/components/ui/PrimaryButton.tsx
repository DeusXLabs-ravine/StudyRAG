import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon: Icon,
}: PrimaryButtonProps) {
  const palette =
    variant === 'primary'
      ? { backgroundColor: colors.primary, color: '#FFFFFF', borderColor: colors.primary }
      : variant === 'secondary'
        ? { backgroundColor: '#FFFFFF', color: colors.text, borderColor: colors.border }
        : { backgroundColor: 'transparent', color: colors.text, borderColor: 'transparent' };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderWidth: variant === 'ghost' ? 0 : 1,
        borderRadius: radius.md,
        paddingHorizontal: 18,
        paddingVertical: 14,
        opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {Icon ? <Icon color={palette.color} size={18} /> : null}
        <Text style={{ color: palette.color, fontFamily: fonts.uiBold, fontSize: 15 }}>{label}</Text>
      </View>
    </Pressable>
  );
}
