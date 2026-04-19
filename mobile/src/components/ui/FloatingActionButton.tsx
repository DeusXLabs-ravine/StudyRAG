import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme/tokens';

type Props = {
  onPress: () => void;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  /** Distance from bottom — set higher on screens with the raised tab bar (default 96) */
  bottom?: number;
  right?: number;
};

/**
 * Reusable FAB anchored bottom-right. Used on Learn, Library-like screens
 * and the Home tab for the "add document" entry-point. Sits above the raised
 * tab bar by default (bottom: 96).
 */
export function FloatingActionButton({
  onPress,
  icon: Icon = Plus,
  accessibilityLabel = 'Add document',
  bottom = 96,
  right = 20,
}: Props) {
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', bottom, right, zIndex: 20 }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Icon color="#FFFFFF" size={24} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}
