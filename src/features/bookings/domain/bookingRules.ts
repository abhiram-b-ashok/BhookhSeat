import { BOOKING_CONFIG, SLOT_START_TIMES } from '../../../constants/appConfig';
import {
  addDays,
  isValidISODate,
  isValidTime,
  parseISODate,
  timeToMinutes,
  toDateTime,
  toISODate,
} from '../../../utils/dateTime';
import type { Restaurant, TableType } from '../../restaurants/domain/restaurant.types';
import { getWeekday } from '../../restaurants/domain/restaurantHours';
import { PLANS, type PlanId } from '../../subscriptions/domain/plans';
import type {
  Booking,
  BookingErrorCode,
  BookingInput,
  DisplayStatus,
  Result,
  SlotInfo,
  SlotStatus,
} from './booking.types';
import { simulatedDemand, type DemandFn } from './simulatedDemand';

const MINUTE_MS = 60_000;

const MESSAGES: Record<BookingErrorCode, string> = {
  RESTAURANT_NOT_FOUND: 'This restaurant could not be found.',
  INVALID_GUEST_COUNT: 'Please choose a valid number of guests.',
  INVALID_DATE: 'Please choose a valid date.',
  DATE_IN_PAST: 'That date has already passed.',
  TOO_FAR_AHEAD: 'That date is too far ahead to book.',
  INVALID_TIME: 'Please choose one of the available times.',
  OUTSIDE_OPENING_HOURS: 'The restaurant is not taking bookings at that time.',
  TOO_SOON: 'That time is too soon. Please pick a later slot.',
  BOOKING_CONFLICT: 'You already have a booking that overlaps this time.',
  NO_TABLE_AVAILABLE: 'Sorry, no table is free for that party size and time.',
  BOOKING_NOT_FOUND: 'That booking could not be found.',
  ALREADY_CANCELLED: 'This booking is already cancelled.',
  CANCELLATION_NOT_ALLOWED: 'This restaurant does not allow cancellations.',
  BOOKING_STARTED: 'This booking has already started or finished.',
  NOT_SIGNED_IN: 'Please sign in to book a table.',
  STILL_LOADING: 'Your bookings are still loading. Please try again in a moment.',
  SERVICE_UNAVAILABLE: 'Could not reach the booking service. Check your connection and try again.',
  BOOKING_LIMIT_REACHED:
    'You have reached the limit of active bookings for your plan. Cancel one or upgrade to book more.',
};

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (code: BookingErrorCode): Result<never> => ({
  ok: false,
  error: { code, message: MESSAGES[code] },
});

/** A failed result for a rule code, for code outside this file that needs to report one. */
export const bookingFailure = fail;

/* ------------------------------------------------------------------ */
/* Basic rules                                                         */
/* ------------------------------------------------------------------ */

/** The biggest party one table can seat. Tables are never combined in this demo. */
export function getMaxGuests(restaurant: Restaurant): number {
  return restaurant.tableInventory.reduce((max, t) => Math.max(max, t.capacity), 0);
}

export function isValidGuestCount(restaurant: Restaurant, guestCount: number): boolean {
  return (
    Number.isInteger(guestCount) &&
    guestCount >= BOOKING_CONFIG.minGuests &&
    guestCount <= getMaxGuests(restaurant)
  );
}

/** Start time must be after opening and no later than the last seating before closing. */
export function isWithinOpeningHours(restaurant: Restaurant, date: string, time: string): boolean {
  const [open, close] = restaurant.openingHours[getWeekday(parseISODate(date))];
  const t = timeToMinutes(time);
  return (
    t >= timeToMinutes(open) &&
    t <= timeToMinutes(close) - BOOKING_CONFIG.lastSeatingBufferMinutes
  );
}

/** The default slot times that fall inside the restaurant's hours on that date. */
export function getCandidateTimes(restaurant: Restaurant, date: string): string[] {
  return SLOT_START_TIMES.filter((time) => isWithinOpeningHours(restaurant, date, time));
}

/** Today up to and including the restaurant's advance-booking limit. */
export function getBookableDates(restaurant: Restaurant, now: Date): string[] {
  const days = restaurant.bookingRules.advanceBookingDays;
  return Array.from({ length: days + 1 }, (_, i) => toISODate(addDays(now, i)));
}

/* ------------------------------------------------------------------ */
/* Simulated table inventory                                           */
/* ------------------------------------------------------------------ */

type Occupancy = { start: number; end: number; tableType: TableType };

function windowOf(date: string, time: string, durationMinutes: number) {
  const start = toDateTime(date, time).getTime();
  return { start, end: start + durationMinutes * MINUTE_MS };
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

const isActive = (b: Booking) => b.status === 'confirmed';

/** Tables held by other fictional diners, one entry per table per slot. */
function simulatedOccupancy(restaurant: Restaurant, date: string, demand: DemandFn): Occupancy[] {
  const result: Occupancy[] = [];
  for (const time of getCandidateTimes(restaurant, date)) {
    const { start, end } = windowOf(date, time, restaurant.bookingRules.slotDurationMinutes);
    for (const table of restaurant.tableInventory) {
      const taken = demand(restaurant.id, date, time, table.type, table.totalTables);
      const count = Math.max(0, Math.min(table.totalTables, Math.floor(taken)));
      for (let i = 0; i < count; i++) result.push({ start, end, tableType: table.type });
    }
  }
  return result;
}

/** Tables held by the user's own confirmed bookings at this restaurant. Cancelled ones hold nothing. */
function bookedOccupancy(restaurant: Restaurant, bookings: Booking[]): Occupancy[] {
  return bookings
    .filter((b) => isActive(b) && b.restaurantId === restaurant.id)
    .map((b) => ({
      ...windowOf(b.date, b.time, b.durationMinutes),
      tableType: b.tableType,
    }));
}

/**
 * Free tables of each type for a booking starting at date/time.
 * A table is only used up if its holder is there at the same moment as someone else, so
 * we look at the busiest moment inside the new booking's window (peak concurrency), not
 * at a simple head count of everything that touches the window.
 */
export function countFreeTables(
  restaurant: Restaurant,
  date: string,
  time: string,
  existingBookings: Booking[],
  demand: DemandFn = simulatedDemand,
): Record<TableType, number> {
  const target = windowOf(date, time, restaurant.bookingRules.slotDurationMinutes);
  const all = [
    ...simulatedOccupancy(restaurant, date, demand),
    ...bookedOccupancy(restaurant, existingBookings),
  ].filter((o) => overlaps(o, target));

  const free = {} as Record<TableType, number>;
  for (const table of restaurant.tableInventory) {
    const ofType = all.filter((o) => o.tableType === table.type);
    // The busiest moment always starts when some booking starts (or when ours does).
    const checkpoints = [target.start, ...ofType.map((o) => o.start).filter((s) => s > target.start)];
    const peak = checkpoints.reduce(
      (max, t) => Math.max(max, ofType.filter((o) => o.start <= t && t < o.end).length),
      0,
    );
    free[table.type] = Math.max(0, table.totalTables - peak);
  }
  return free;
}

/** Smallest table that fits the party and still has one free. */
export function pickTable(
  restaurant: Restaurant,
  guestCount: number,
  free: Record<TableType, number>,
): TableType | null {
  const fitting = restaurant.tableInventory
    .filter((t) => t.capacity >= guestCount)
    .sort((a, b) => a.capacity - b.capacity);
  return fitting.find((t) => free[t.type] > 0)?.type ?? null;
}

/* ------------------------------------------------------------------ */
/* Slot availability                                                   */
/* ------------------------------------------------------------------ */

type EvaluateArgs = {
  restaurant: Restaurant;
  date: string;
  time: string;
  guestCount: number;
  existingBookings: Booking[];
  now: Date;
  demand?: DemandFn;
};

/** The single place that decides whether a slot can be booked. */
export function evaluateSlot(args: EvaluateArgs): { status: SlotStatus; tableType: TableType | null } {
  const { restaurant, date, time, guestCount, existingBookings, now, demand } = args;
  const window = windowOf(date, time, restaurant.bookingRules.slotDurationMinutes);

  if (window.start < now.getTime() + BOOKING_CONFIG.minLeadMinutes * MINUTE_MS) {
    return { status: 'too_soon', tableType: null };
  }

  // A person cannot be at two tables at once, at this or any other restaurant.
  const clash = existingBookings.some(
    (b) => isActive(b) && overlaps(window, windowOf(b.date, b.time, b.durationMinutes)),
  );
  if (clash) return { status: 'conflict', tableType: null };

  const free = countFreeTables(restaurant, date, time, existingBookings, demand);
  const tableType = pickTable(restaurant, guestCount, free);
  return tableType ? { status: 'available', tableType } : { status: 'full', tableType: null };
}

export function getSlots(args: Omit<EvaluateArgs, 'time'>): SlotInfo[] {
  return getCandidateTimes(args.restaurant, args.date).map((time) => ({
    time,
    ...evaluateSlot({ ...args, time }),
  }));
}

/** First date (today onwards) with at least one bookable slot, or null. */
export function findFirstBookableDate(
  args: Omit<EvaluateArgs, 'time' | 'date'>,
): string | null {
  return (
    getBookableDates(args.restaurant, args.now).find((date) =>
      getSlots({ ...args, date }).some((s) => s.status === 'available'),
    ) ?? null
  );
}

/* ------------------------------------------------------------------ */
/* Create / cancel                                                     */
/* ------------------------------------------------------------------ */

type BuildArgs = {
  restaurants: Restaurant[];
  input: BookingInput;
  existingBookings: Booking[];
  now: Date;
  id: string;
  userId?: string;
  /** Defaults to Free, so a caller that forgets to pass it can never grant extra bookings. */
  plan?: PlanId;
  demand?: DemandFn;
};

/** Validates everything and returns a new confirmed booking, or the first rule it breaks. */
export function buildBooking({
  restaurants,
  input,
  existingBookings,
  now,
  id,
  userId,
  plan = 'free',
  demand,
}: BuildArgs): Result<Booking> {
  const restaurant = restaurants.find((r) => r.id === input.restaurantId);
  if (!restaurant) return fail('RESTAURANT_NOT_FOUND');

  if (!isValidGuestCount(restaurant, input.guestCount)) return fail('INVALID_GUEST_COUNT');

  if (!isValidISODate(input.date)) return fail('INVALID_DATE');
  if (input.date < toISODate(now)) return fail('DATE_IN_PAST');
  const lastDay = toISODate(addDays(now, restaurant.bookingRules.advanceBookingDays));
  if (input.date > lastDay) return fail('TOO_FAR_AHEAD');

  if (!isValidTime(input.time) || !SLOT_START_TIMES.includes(input.time)) return fail('INVALID_TIME');
  if (!isWithinOpeningHours(restaurant, input.date, input.time)) return fail('OUTSIDE_OPENING_HOURS');

  // The plan's limit lives here, with every other booking rule, not in any screen.
  const activeBookings = existingBookings.filter((b) => getDisplayStatus(b, now) === 'confirmed').length;
  if (activeBookings >= PLANS[plan].maxActiveBookings) return fail('BOOKING_LIMIT_REACHED');

  const { status, tableType } = evaluateSlot({
    restaurant,
    date: input.date,
    time: input.time,
    guestCount: input.guestCount,
    existingBookings,
    now,
    demand,
  });
  if (status === 'too_soon') return fail('TOO_SOON');
  if (status === 'conflict') return fail('BOOKING_CONFLICT');
  if (status === 'full' || !tableType) return fail('NO_TABLE_AVAILABLE');

  const table = restaurant.tableInventory.find((t) => t.type === tableType);

  return ok({
    id,
    userId,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    durationMinutes: restaurant.bookingRules.slotDurationMinutes,
    cancellationAllowed: restaurant.bookingRules.cancellationAllowed,
    date: input.date,
    time: input.time,
    guestCount: input.guestCount,
    tableType,
    tableLabel: table?.label ?? tableType,
    status: 'confirmed',
    createdAt: now.toISOString(),
  });
}

/** Returns the cancelled copy of a booking. Cancelled bookings stop holding a table. */
export function cancelBooking(bookings: Booking[], bookingId: string, now: Date): Result<Booking> {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return fail('BOOKING_NOT_FOUND');
  if (booking.status === 'cancelled') return fail('ALREADY_CANCELLED');
  if (!booking.cancellationAllowed) return fail('CANCELLATION_NOT_ALLOWED');
  if (toDateTime(booking.date, booking.time).getTime() <= now.getTime()) return fail('BOOKING_STARTED');
  return ok({ ...booking, status: 'cancelled' });
}

/* ------------------------------------------------------------------ */
/* Upcoming / past                                                     */
/* ------------------------------------------------------------------ */

const endOf = (b: Booking) => windowOf(b.date, b.time, b.durationMinutes).end;

export function getDisplayStatus(booking: Booking, now: Date): DisplayStatus {
  if (booking.status === 'cancelled') return 'cancelled';
  return endOf(booking) > now.getTime() ? 'confirmed' : 'completed';
}

const startOf = (b: Booking) => toDateTime(b.date, b.time).getTime();

/** Upcoming: soonest first. Past (finished or cancelled): most recent first. */
export function partitionBookings(bookings: Booking[], now: Date) {
  const upcoming = bookings
    .filter((b) => getDisplayStatus(b, now) === 'confirmed')
    .sort((a, b) => startOf(a) - startOf(b));
  const past = bookings
    .filter((b) => getDisplayStatus(b, now) !== 'confirmed')
    .sort((a, b) => startOf(b) - startOf(a));
  return { upcoming, past };
}
