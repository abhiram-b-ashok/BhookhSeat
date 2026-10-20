
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export default function AppHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  title: typography.title,
  subtitle: { ...typography.caption, marginTop: spacing.xs },
});