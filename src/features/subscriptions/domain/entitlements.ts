import type { Booking } from '../../bookings/domain/booking.types';
import { getDisplayStatus } from '../../bookings/domain/bookingRules';
import { PLANS, PREMIUM_ENTITLEMENT_ID, type PlanId, type PlanState } from './plans';

export type SubscriptionState =
  | { status: 'loading' }
  /** Purchases cannot be used (no valid key, offline, SDK error). Behaves as Free. */
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; isPremium: boolean };

/** Premium only when RevenueCat has confirmed it. Every other state is Free or unknown. */
export function planStateFor(state: SubscriptionState): PlanState {
  if (state.status === 'loading') return 'unknown';
  if (state.status === 'unavailable') return 'free';
  return state.isPremium ? 'premium' : 'free';
}

export function planFor(state: SubscriptionState): PlanId {
  return planStateFor(state) === 'premium' ? 'premium' : 'free';
}

/** The part of RevenueCat's CustomerInfo we rely on, so this can be tested without the SDK. */
export type EntitlementInfoLike = { entitlements: { active: Record<string, unknown> } };

export function isPremiumFromCustomerInfo(info: EntitlementInfoLike): boolean {
  return Object.prototype.hasOwnProperty.call(info.entitlements.active, PREMIUM_ENTITLEMENT_ID);
}

/** Confirmed bookings that have not finished yet. Cancelled and finished ones do not count. */
export function countActiveBookings(bookings: Booking[], now: Date): number {
  return bookings.filter((b) => getDisplayStatus(b, now) === 'confirmed').length;
}

export function describeUsage(plan: PlanId, active: number): string {
  return `${active} of ${PLANS[plan].maxActiveBookings} active bookings`;
}
