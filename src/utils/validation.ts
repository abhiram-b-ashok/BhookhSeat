export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const hasErrors = (errors: object): boolean => Object.keys(errors).length > 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message, or null when the value is fine. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (value.length > 254 || !EMAIL_RE.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password.trim()) return 'Enter a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim().replace(/\s+/g, ' ');
  if (!value) return 'Enter your name.';
  if (value.length < 2) return 'Your name is too short.';
  if (value.length > 40) return 'Your name is too long (40 characters max).';
  return null;
}

export type SignInFields = { email: string; password: string };

/** On sign-in we only check the fields are filled, so we never reveal our password rules. */
export function validateSignIn({ email, password }: SignInFields): FieldErrors<keyof SignInFields> {
  const errors: FieldErrors<keyof SignInFields> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export type SignUpFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function validateSignUp(fields: SignUpFields): FieldErrors<keyof SignUpFields> {
  const errors: FieldErrors<keyof SignUpFields> = {};
  const nameError = validateName(fields.name);
  if (nameError) errors.name = nameError;
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(fields.password);
  if (passwordError) errors.password = passwordError;
  else if (fields.confirmPassword !== fields.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}
