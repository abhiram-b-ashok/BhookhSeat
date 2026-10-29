export type PlanId = 'free' | 'premium';

/** 'unknown' = we have not heard back from RevenueCat yet. Treated as Free, never as Premium. */
export type PlanState = PlanId | 'unknown';

/** Must match the entitlement identifier in the RevenueCat dashboard exactly. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Limits come from the seed data's subscriptionDemo block (a proposed portfolio rule). */
export const PLANS: Record<PlanId, { label: string; maxActiveBookings: number }> = {
  free: { label: 'Free', maxActiveBookings: 2 },
  premium: { label: 'Premium', maxActiveBookings: 10 },
};

/** One purchasable option as the screen sees it. The SDK's own objects stay in services/purchases. */
export type PlanOption = {
  id: string;
  title: string;
  priceString: string;
};
