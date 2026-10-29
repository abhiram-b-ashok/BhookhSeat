import * as fs from 'fs';
import * as path from 'path';
import { purchaseErrorKind, purchaseErrorMessage, PURCHASE_ERROR_CODES } from '../features/subscriptions/domain/purchaseErrors';
import { toError } from '@/utils/errors';


describe('toError', () => {
  it('returns real errors untouched', () => {
    const e = new TypeError('boom');
    expect(toError(e)).toBe(e);
  });

  it('wraps strings and objects that carry a message', () => {
    expect(toError('plain text').message).toBe('plain text');
    expect(toError({ message: 'from object', code: 'x' }).message).toBe('from object');
  });

  it('copes with values that have no usable message', () => {
    for (const v of [null, undefined, 42, {}, [], '', { message: 7 }]) {
      const e = toError(v);
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Unknown error');
    }
  });

  it('cuts very long messages down', () => {
    expect(toError('x'.repeat(5000)).message).toHaveLength(300);
  });
});

describe('purchaseErrorKind', () => {
  const withCode = (code: string) => ({ code, message: 'raw' });

  it('recognises a cancelled purchase, which is not an error to show', () => {
    expect(purchaseErrorKind(withCode(PURCHASE_ERROR_CODES.PURCHASE_CANCELLED_ERROR))).toBe('cancelled');
    expect(purchaseErrorMessage('cancelled')).toBeNull();
  });

  it('groups network problems', () => {
    expect(purchaseErrorKind(withCode(PURCHASE_ERROR_CODES.NETWORK_ERROR))).toBe('network');
    expect(purchaseErrorKind(withCode(PURCHASE_ERROR_CODES.OFFLINE_CONNECTION_ERROR))).toBe('network');
  });

  it('recognises an already-owned product', () => {
    expect(purchaseErrorKind(withCode(PURCHASE_ERROR_CODES.PRODUCT_ALREADY_PURCHASED_ERROR))).toBe('already_owned');
  });

  it('groups store and setup problems as unavailable', () => {
    for (const code of [
      PURCHASE_ERROR_CODES.STORE_PROBLEM_ERROR,
      PURCHASE_ERROR_CODES.PURCHASE_NOT_ALLOWED_ERROR,
      PURCHASE_ERROR_CODES.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,
      PURCHASE_ERROR_CODES.CONFIGURATION_ERROR,
    ]) {
      expect(purchaseErrorKind(withCode(code))).toBe('unavailable');
    }
  });

  it('treats anything unknown as "other", without throwing', () => {
    for (const v of [withCode('9999'), new Error('x'), null, undefined, 'str', 7]) {
      expect(purchaseErrorKind(v)).toBe('other');
    }
  });
});

describe('error codes match the installed RevenueCat SDK', () => {
  const file = path.resolve(
    __dirname,
    '../../node_modules/@revenuecat/purchases-typescript-internal/dist/generated/error-codes.d.ts',
  );
  // Skipped (not failed) only if the package is laid out differently on this machine.
  const check = fs.existsSync(file) ? it : it.skip;

  check('has exactly the values this app copied', () => {
    const text = fs.readFileSync(file, 'utf8');
    for (const [name, value] of Object.entries(PURCHASE_ERROR_CODES)) {
      expect(text).toMatch(new RegExp(`\\b${name} = "${value}"`));
    }
  });
});
