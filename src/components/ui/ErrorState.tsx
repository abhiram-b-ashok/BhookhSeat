
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import AppButton from './AppButton';

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.alert} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <View style={styles.button}>
          <AppButton title="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  title: { ...typography.body, fontWeight: '600', marginTop: spacing.sm },
  message: { ...typography.caption, textAlign: 'center' },
  button: { marginTop: spacing.md, alignSelf: 'stretch' },
});