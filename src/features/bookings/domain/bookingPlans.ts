import type { Restaurant } from '../../restaurants/domain/restaurant.types';
import type { PlanId } from '../../subscriptions/domain/plans';
import type { Booking, BookingInput, Result } from './booking.types';
import { buildBooking, cancelBooking } from './bookingRules';
import { adjustCounts, buildSharedDemand, occupancyDocId, type OccupancyCounts } from './occupancy';
import type { DemandFn } from './simulatedDemand';

export type Plan = { booking: Booking; nextCounts: OccupancyCounts; occupancyId: string };

type CreateArgs = {
  userId: string;
  restaurants: Restaurant[];
  input: BookingInput;
  ownBookings: Booking[];
  /** The shared counts as read INSIDE the transaction, so the decision is made on fresh data. */
  counts: OccupancyCounts;
  now: Date;
  id: string;
  plan?: PlanId;
  baseDemand?: DemandFn;
};

/**
 * Decides whether a booking is allowed and what to write. Touches nothing itself, so the
 * Firestore transaction only has to read, call this, and write the result.
 */
export function planCreate(args: CreateArgs): Result<Plan> {
  const { userId, restaurants, input, ownBookings, counts, now, id, plan, baseDemand } = args;

  const result = buildBooking({
    restaurants,
    input,
    existingBookings: ownBookings,
    now,
    id,
    userId,
    plan,
    demand: buildSharedDemand({
      counts,
      ownBookings,
      restaurantId: input.restaurantId,
      date: input.date,
      baseDemand,
    }),
  });
  if (!result.ok) return result;

  const booking = result.value;
  return {
    ok: true,
    value: {
      booking,
      nextCounts: adjustCounts(counts, booking.time, booking.tableType, +1),
      occupancyId: occupancyDocId(booking.restaurantId, booking.date),
    },
  };
}

/** `booking` must be the fresh copy read inside the transaction, not a possibly stale local one. */
export function planCancel(args: { booking: Booking; counts: OccupancyCounts; now: Date }): Result<Plan> {
  const { booking, counts, now } = args;

  const result = cancelBooking([booking], booking.id, now);
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      booking: result.value,
      nextCounts: adjustCounts(counts, booking.time, booking.tableType, -1),
      occupancyId: occupancyDocId(booking.restaurantId, booking.date),
    },
  };
}
