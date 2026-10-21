
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** A tag. Pass onPress to make it a selectable filter chip. */
export default function CuisineChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary },
  text: { color: colors.textSecondary, fontSize: 13 },
  textSelected: { color: colors.onPrimary, fontWeight: '600' },
});