import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export default function BackButton() {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={styles.back}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
      <Text style={styles.text}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  text: { color: colors.primary, fontSize: 16 },
});
