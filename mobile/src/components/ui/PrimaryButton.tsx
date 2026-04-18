import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark';
type Size = 'md' | 'lg';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: LucideIcon;
  iconPosition?: 'leading' | 'trailing';
  size?: Size;
  fullWidth?: boolean;
};

const palettes: Record<Variant, { bg: string; fg: string; border: string; shadow: string }> = {
  primary:   { bg: colors.primary, fg: '#FFFFFF',          border: colors.primary, shadow: colors.primary },
  secondary: { bg: '#FFFFFF',      fg: colors.text,        border: '#E2E8F0',      shadow: '#0F172A' },
  ghost:     { bg: 'transparent',  fg: colors.textMuted,   border: 'transparent',  shadow: 'transparent' },
  onDark:    { bg: '#FFFFFF',      fg: colors.primaryDeep, border: '#FFFFFF',      shadow: '#0F172A' },
};

const heights: Record<Size, number> = { md: 48, lg: 56 };

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'leading',
  size = 'lg',
  fullWidth = true,
}: PrimaryButtonProps) {
  const p = palettes[variant];
  const isDisabled = disabled || loading;
  const height = heights[size];
  const isElevated = variant === 'primary' || variant === 'onDark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: p.bg,
        borderColor: p.border,
        borderWidth: variant === 'secondary' ? 1 : variant === 'ghost' ? 0 : 0,
        borderRadius: radius.md,
        height,
        paddingHorizontal: 20,
        alignSelf: fullWidth ? 'stretch' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.5 : pressed ? 0.94 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        shadowColor: p.shadow,
        shadowOpacity: isElevated ? 0.25 : variant === 'secondary' ? 0.05 : 0,
        shadowRadius: isElevated ? 16 : 6,
        shadowOffset: { width: 0, height: isElevated ? 10 : 2 },
        elevation: isElevated ? 6 : variant === 'secondary' ? 1 : 0,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        {loading ? <ActivityIndicator size="small" color={p.fg} /> : null}
        {!loading && Icon && iconPosition === 'leading' ? <Icon color={p.fg} size={18} strokeWidth={2.4} /> : null}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: p.fg,
            fontFamily: fonts.uiBold,
            fontSize: 16,
            letterSpacing: 0.15,
            flexShrink: 1,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        {!loading && Icon && iconPosition === 'trailing' ? <Icon color={p.fg} size={18} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}
