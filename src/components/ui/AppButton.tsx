
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface },
  dimmed: { opacity: 0.6 },
  text: { fontSize: 16, fontWeight: 'bold' },
  primaryText: { color: colors.onPrimary },
  secondaryText: { color: colors.primary },
});