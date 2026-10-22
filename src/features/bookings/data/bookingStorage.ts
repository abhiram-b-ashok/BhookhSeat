import { isValidISODate, isValidTime } from '../../../utils/dateTime';
import type { TableType } from '../../restaurants/domain/restaurant.types';
import type { Booking, BookingStatus } from '../domain/booking.types';

/** Bump STORAGE_VERSION if the Booking shape changes, and migrate in parseStoredBookings. */
export const BOOKINGS_STORAGE_KEY = 'bhookhseat.bookings';
const STORAGE_VERSION = 1;

const STATUSES: readonly BookingStatus[] = ['confirmed', 'cancelled'];
const TABLE_TYPES: readonly TableType[] = ['couple', 'standard', 'family', 'large_group'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Storage can hold anything (old versions, hand edits, corruption), so check every field. */
export function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
  const v = value;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.restaurantId === 'string' &&
    typeof v.restaurantName === 'string' &&
    typeof v.tableLabel === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.cancellationAllowed === 'boolean' &&
    typeof v.date === 'string' &&
    isValidISODate(v.date) &&
    typeof v.time === 'string' &&
    isValidTime(v.time) &&
    typeof v.guestCount === 'number' &&
    Number.isInteger(v.guestCount) &&
    v.guestCount >= 1 &&
    typeof v.durationMinutes === 'number' &&
    Number.isFinite(v.durationMinutes) &&
    v.durationMinutes > 0 &&
    STATUSES.includes(v.status as BookingStatus) &&
    TABLE_TYPES.includes(v.tableType as TableType)
  );
}

export function serializeBookings(bookings: Booking[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, bookings });
}

/** Never throws. Anything unreadable becomes an empty list, and bad entries are dropped. */
export function parseStoredBookings(raw: string | null): Booking[] {
  if (!raw) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(data) || data.version !== STORAGE_VERSION || !Array.isArray(data.bookings)) {
    return [];
  }

  const byId = new Map<string, Booking>();
  for (const entry of data.bookings) {
    if (isBooking(entry) && !byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}
