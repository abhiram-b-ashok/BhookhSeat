import { mapAuthError } from '../features/auth/domain/authErrors';

const withCode = (code: string) => Object.assign(new Error('raw firebase text'), { code });

describe('auth error messages', () => {
  it('explains the common sign-up and sign-in failures', () => {
    expect(mapAuthError(withCode('auth/email-already-in-use'))).toMatch(/already exists/i);
    expect(mapAuthError(withCode('auth/weak-password'))).toMatch(/stronger password/i);
    expect(mapAuthError(withCode('auth/invalid-email'))).toMatch(/valid email/i);
    expect(mapAuthError(withCode('auth/network-request-failed'))).toMatch(/connection/i);
    expect(mapAuthError(withCode('auth/too-many-requests'))).toMatch(/too many/i);
    expect(mapAuthError(withCode('auth/user-disabled'))).toMatch(/disabled/i);
  });

  it('gives the same message for a wrong password and an unknown email', () => {
    const messages = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].map(
      (code) => mapAuthError(withCode(code)),
    );
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/incorrect email or password/i);
  });

  it('points at the Firebase console when email sign-in is not enabled', () => {
    expect(mapAuthError(withCode('auth/operation-not-allowed'))).toMatch(/Firebase console/);
  });

  it('never shows raw error text for unknown errors', () => {
    const message = mapAuthError(withCode('auth/something-brand-new'));
    expect(message).toBe('Something went wrong. Please try again.');
    expect(message).not.toMatch(/raw firebase text/);
  });

  it('copes with values that are not Firebase errors', () => {
    const fallback = 'Something went wrong. Please try again.';
    expect(mapAuthError(new Error('boom'))).toBe(fallback);
    expect(mapAuthError('a string')).toBe(fallback);
    expect(mapAuthError(null)).toBe(fallback);
    expect(mapAuthError(undefined)).toBe(fallback);
  });
});
