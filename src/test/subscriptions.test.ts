import type { Booking } from '../features/bookings/domain/booking.types';
import {
  countActiveBookings,
  describeUsage,
  isPremiumFromCustomerInfo,
  planFor,
  planStateFor,
} from '../features/subscriptions/domain/entitlements';
import { PLANS, PREMIUM_ENTITLEMENT_ID } from '../features/subscriptions/domain/plans';
import { purchaseErrorMessage } from '../features/subscriptions/domain/purchaseErrors';
import { resolveRevenueCatKey } from '../features/subscriptions/domain/revenueCatKey';

const NOW = new Date(2026, 9, 20, 10, 0);
const booking = (id: string, o: Partial<Booking> = {}): Booking => ({
  id, userId: 'u1', restaurantId: 'rest_001', restaurantName: 'Coconut Grove', durationMinutes: 90,
  cancellationAllowed: true, date: '2026-10-25', time: '19:30', guestCount: 2, tableType: 'couple',
  tableLabel: 'Couple table', status: 'confirmed', createdAt: '2026-10-20T04:30:00.000Z', ...o,
});

describe('plan limits come from the seed data rule', () => {
  it('Free = 2, Premium = 10', () => {
    expect(PLANS.free.maxActiveBookings).toBe(2);
    expect(PLANS.premium.maxActiveBookings).toBe(10);
  });
});

describe('Premium only when RevenueCat has confirmed it', () => {
  it('is unknown while loading, and never Premium', () => {
    expect(planStateFor({ status: 'loading' })).toBe('unknown');
    expect(planFor({ status: 'loading' })).toBe('free');
  });

  it('is Free when purchases are unavailable', () => {
    expect(planStateFor({ status: 'unavailable', reason: 'offline' })).toBe('free');
    expect(planFor({ status: 'unavailable', reason: 'offline' })).toBe('free');
  });

  it('is Premium only for a ready, confirmed entitlement', () => {
    expect(planFor({ status: 'ready', isPremium: true })).toBe('premium');
    expect(planFor({ status: 'ready', isPremium: false })).toBe('free');
  });
});

describe('reading the entitlement from RevenueCat', () => {
  it('is Premium when the premium entitlement is active', () => {
    expect(isPremiumFromCustomerInfo({ entitlements: { active: { [PREMIUM_ENTITLEMENT_ID]: {} } } })).toBe(true);
  });

  it('is not Premium with no entitlements or a different one', () => {
    expect(isPremiumFromCustomerInfo({ entitlements: { active: {} } })).toBe(false);
    expect(isPremiumFromCustomerInfo({ entitlements: { active: { gold: {} } } })).toBe(false);
  });

  it('is not fooled by inherited object properties', () => {
    expect(isPremiumFromCustomerInfo({ entitlements: { active: Object.create({ [PREMIUM_ENTITLEMENT_ID]: {} }) } })).toBe(false);
  });
});

describe('counting active bookings', () => {
  it('counts only confirmed bookings that have not finished', () => {
    const list = [
      booking('upcoming'),
      booking('cancelled', { status: 'cancelled' }),
      booking('finished', { date: '2026-10-19' }),
      booking('later', { date: '2026-11-01' }),
    ];
    expect(countActiveBookings(list, NOW)).toBe(2);
    expect(countActiveBookings([], NOW)).toBe(0);
  });

  it('describes usage for the plan', () => {
    expect(describeUsage('free', 1)).toBe('1 of 2 active bookings');
    expect(describeUsage('premium', 4)).toBe('4 of 10 active bookings');
  });
});

describe('choosing a RevenueCat key safely', () => {
  const base = { platform: 'android' };

  it('uses the Test Store key in development', () => {
    const r = resolveRevenueCatKey({ ...base, isDev: true, testKey: 'test_abc' });
    expect(r).toEqual({ ok: true, key: 'test_abc', mode: 'test' });
  });

  it('prefers the Test Store key in development even when a live key exists', () => {
    const r = resolveRevenueCatKey({ ...base, isDev: true, testKey: 'test_abc', androidKey: 'goog_xyz' });
    expect(r.ok && r.mode).toBe('test');
  });

  it('falls back to the live key in development when there is no test key', () => {
    const r = resolveRevenueCatKey({ ...base, isDev: true, androidKey: 'goog_xyz' });
    expect(r).toEqual({ ok: true, key: 'goog_xyz', mode: 'live' });
  });

  it('NEVER uses a Test Store key in a release build, even if one is present', () => {
    expect(resolveRevenueCatKey({ ...base, isDev: false, testKey: 'test_abc' }).ok).toBe(false);
    const withLive = resolveRevenueCatKey({ ...base, isDev: false, testKey: 'test_abc', androidKey: 'goog_xyz' });
    expect(withLive).toEqual({ ok: true, key: 'goog_xyz', mode: 'live' });
  });

  it('refuses a Test Store key that was put in the Android slot, in any build', () => {
    const r = resolveRevenueCatKey({ ...base, isDev: false, androidKey: 'test_abc' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/must not be used/);
    expect(resolveRevenueCatKey({ ...base, isDev: true, androidKey: 'test_abc' }).ok).toBe(false); // refused in dev too
  });

  it('rejects keys with the wrong prefix', () => {
    expect(resolveRevenueCatKey({ ...base, isDev: false, androidKey: 'appl_abc' }).ok).toBe(false);
    expect(resolveRevenueCatKey({ ...base, isDev: true, testKey: 'goog_abc' }).ok).toBe(false);
  });

  it('explains what is missing, differently for development and release', () => {
    const dev = resolveRevenueCatKey({ ...base, isDev: true });
    const rel = resolveRevenueCatKey({ ...base, isDev: false });
    expect(!dev.ok && dev.reason).toMatch(/\.env\.local/);
    expect(!rel.ok && rel.reason).toMatch(/not available in this build/);
  });

  it('ignores surrounding whitespace', () => {
    expect(resolveRevenueCatKey({ ...base, isDev: true, testKey: '  test_abc \n' }).ok).toBe(true);
  });

  it('is Android only', () => {
    expect(resolveRevenueCatKey({ platform: 'ios', isDev: true, testKey: 'test_abc' }).ok).toBe(false);
  });
});

describe('purchase messages', () => {
  it('says nothing for a cancelled purchase', () => {
    expect(purchaseErrorMessage('cancelled')).toBeNull();
  });

  it('reassures the user that they were not charged when it fails', () => {
    expect(purchaseErrorMessage('other')).toMatch(/not been charged/);
  });

  it('points to Restore when the product is already owned', () => {
    expect(purchaseErrorMessage('already_owned')).toMatch(/Restore purchases/);
  });

  it('has a message for every non-cancelled kind', () => {
    for (const kind of ['network', 'already_owned', 'unavailable', 'other'] as const) {
      expect(purchaseErrorMessage(kind)).toEqual(expect.any(String));
    }
  });
});
