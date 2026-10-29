import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import { colors, spacing, typography } from '@/constants/theme';
import { reportError } from '@/services/firebase/crashlytics';

/** Shown instead of a blank screen if something throws while rendering. The error is reported. */
export default function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, 'render-error');
  }, [error]);

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.alert} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        The problem has been reported. You can try again, or restart the app if it keeps happening.
      </Text>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      <View style={styles.button}>
        <AppButton title="Try again" onPress={retry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.title, textAlign: 'center' },
  message: { ...typography.caption, textAlign: 'center' },
  detail: { color: colors.alert, fontSize: 12, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: spacing.lg },
});
