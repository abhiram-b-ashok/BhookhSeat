import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type Props = TextInputProps & {
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Shows a red outline and this message under the field. */
  error?: string;
};

export default function AppTextInput({ leftIcon, error, style, ...rest }: Props) {
  return (
    <View>
      <View style={[styles.container, error ? styles.containerError : null]}>
        {leftIcon ? <Ionicons name={leftIcon} size={20} color={colors.textSecondary} /> : null}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  containerError: { borderColor: colors.alert },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.lg,
  },
  error: { color: colors.alert, fontSize: 13, marginTop: spacing.xs, marginLeft: spacing.xs },
});
