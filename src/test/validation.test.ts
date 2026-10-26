import {
  hasErrors,
  validateEmail,
  validateName,
  validatePassword,
  validateSignIn,
  validateSignUp,
} from '../utils/validation';

describe('email validation', () => {
  it.each(['a@b.co', 'first.last@example.com', 'x+tag@sub.domain.org', '  padded@example.com  '])(
    'accepts %p',
    (email) => expect(validateEmail(email)).toBeNull(),
  );

  it.each(['', '   ', 'plain', '@no-local.com', 'no-domain@', 'no-dot@domain', 'two@@at.com', 'sp ace@x.com'])(
    'rejects %p',
    (email) => expect(validateEmail(email)).not.toBeNull(),
  );

  it('rejects absurdly long addresses', () => {
    expect(validateEmail(`${'a'.repeat(250)}@x.com`)).not.toBeNull();
  });
});

describe('password validation', () => {
  it('requires at least 8 characters', () => {
    expect(validatePassword('')).not.toBeNull();
    expect(validatePassword('        ')).not.toBeNull(); // only spaces
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });

  it('allows spaces inside a long passphrase', () => {
    expect(validatePassword('correct horse battery')).toBeNull();
  });
});

describe('name validation', () => {
  it('accepts ordinary names, including accents and spacing', () => {
    expect(validateName('Asha')).toBeNull();
    expect(validateName('  Anu   Krishnan ')).toBeNull();
    expect(validateName('José')).toBeNull();
  });

  it('rejects empty, one-letter and very long names', () => {
    expect(validateName('')).not.toBeNull();
    expect(validateName('   ')).not.toBeNull();
    expect(validateName('A')).not.toBeNull();
    expect(validateName('x'.repeat(41))).not.toBeNull();
    expect(validateName('x'.repeat(40))).toBeNull();
  });
});

describe('sign-in form', () => {
  it('passes when both fields are filled', () => {
    expect(validateSignIn({ email: 'a@b.co', password: 'x' })).toEqual({});
  });

  it('does not enforce password rules, so it never reveals them', () => {
    expect(validateSignIn({ email: 'a@b.co', password: 'short' })).toEqual({});
  });

  it('reports each missing field', () => {
    const errors = validateSignIn({ email: '', password: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'password']);
  });
});

describe('sign-up form', () => {
  const valid = { name: 'Asha', email: 'asha@example.com', password: 'longenough1', confirmPassword: 'longenough1' };

  it('passes with valid input', () => {
    expect(validateSignUp(valid)).toEqual({});
    expect(hasErrors(validateSignUp(valid))).toBe(false);
  });

  it('flags a mismatched confirmation', () => {
    const errors = validateSignUp({ ...valid, confirmPassword: 'different1' });
    expect(Object.keys(errors)).toEqual(['confirmPassword']);
  });

  it('reports the weak password, not a mismatch, when the password itself is invalid', () => {
    const errors = validateSignUp({ ...valid, password: 'short', confirmPassword: 'other' });
    expect(Object.keys(errors)).toEqual(['password']);
  });

  it('collects every problem at once', () => {
    const errors = validateSignUp({ name: '', email: 'nope', password: '', confirmPassword: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
    expect(hasErrors(errors)).toBe(true);
  });
});
