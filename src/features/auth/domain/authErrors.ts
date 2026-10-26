const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  // Wrong password and unknown email share one message, so we never reveal which accounts exist.
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed':
    'Email and password sign-in is turned off for this Firebase project. Enable it in the Firebase console.',
};

const FALLBACK = 'Something went wrong. Please try again.';

/** Turns any thrown value into a message that is safe to show. Never shows raw error text. */
export function mapAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    return MESSAGES[code] ?? FALLBACK;
  }
  return FALLBACK;
}
