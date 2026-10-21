
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type Props = TextInputProps & {
  leftIcon?: keyof typeof Ionicons.glyphMap;
};

export default function AppTextInput({ leftIcon, style, ...rest }: Props) {
  return (
    <View style={styles.container}>
      {leftIcon ? (
        <Ionicons name={leftIcon} size={20} color={colors.textSecondary} />
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.lg,
  },
});