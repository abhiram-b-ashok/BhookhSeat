import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import AppTextInput from '@/components/ui/AppTextInput';
import { colors, spacing, typography } from '@/constants/theme';
import { FieldErrors, hasErrors, validateSignIn } from '@/utils/validation';
import { mapAuthError } from '../domain/authErrors';

type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToSignUp: () => void;
};

export default function SignInForm({ onSubmit, onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const handleSubmit = async () => {
    if (inFlight.current) return; // ignore repeated taps
    const found = validateSignIn({ email, password });
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
      // Success: the app switches screens by itself once Firebase reports the sign-in.
    } catch (error) {
      setFormError(mapAuthError(error));
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <AppTextInput
        leftIcon="mail-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        accessibilityLabel="Email"
      />
      <AppTextInput
        leftIcon="lock-closed-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Password"
      />

      {formError ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <AppButton
        title={submitting ? 'Signing in…' : 'Sign in'}
        onPress={handleSubmit}
        disabled={submitting}
      />

      <Pressable onPress={onSwitchToSignUp} accessibilityRole="link" style={styles.switch}>
        <Text style={typography.caption}>
          New here? <Text style={styles.link}>Create an account</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  formError: { color: colors.alert, fontSize: 14 },
  switch: { alignItems: 'center', padding: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
});
