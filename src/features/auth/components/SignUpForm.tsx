import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '@/components/ui/AppButton';
import AppTextInput from '@/components/ui/AppTextInput';
import { colors, spacing, typography } from '@/constants/theme';
import { FieldErrors, hasErrors, validateSignUp } from '@/utils/validation';
import { mapAuthError } from '../domain/authErrors';

type Props = {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  onSwitchToSignIn: () => void;
};

type Field = 'name' | 'email' | 'password' | 'confirmPassword';

export default function SignUpForm({ onSubmit, onSwitchToSignIn }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const handleSubmit = async () => {
    if (inFlight.current) return;
    const found = validateSignUp({ name, email, password, confirmPassword });
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await onSubmit(name, email.trim(), password);
    } catch (error) {
      setFormError(mapAuthError(error));
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <AppTextInput
        leftIcon="person-outline"
        placeholder="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        accessibilityLabel="Name"
      />
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
        placeholder="Password (8+ characters)"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        accessibilityLabel="Password"
      />
      <AppTextInput
        leftIcon="lock-closed-outline"
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Confirm password"
      />

      {formError ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <AppButton
        title={submitting ? 'Creating account…' : 'Create account'}
        onPress={handleSubmit}
        disabled={submitting}
      />

      <Pressable onPress={onSwitchToSignIn} accessibilityRole="link" style={styles.switch}>
        <Text style={typography.caption}>
          Already have an account? <Text style={styles.link}>Sign in</Text>
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
