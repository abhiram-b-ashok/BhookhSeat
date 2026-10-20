
import { StyleSheet, Text } from 'react-native';
import { spacing, typography } from '@/constants/theme';

export default function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.sectionTitle,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
});