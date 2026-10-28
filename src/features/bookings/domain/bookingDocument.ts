import type { Booking } from './booking.types';

/**
 * The fields of a booking document, in one place. firestore.rules lists the same names,
 * and a test fails if the two ever drift apart.
 */
export const BOOKING_DOCUMENT_KEYS = [
  'id',
  'userId',
  'restaurantId',
  'restaurantName',
  'durationMinutes',
  'cancellationAllowed',
  'date',
  'time',
  'guestCount',
  'tableType',
  'tableLabel',
  'status',
  'createdAt',
] as const;

export const OCCUPANCY_DOCUMENT_KEYS = ['restaurantId', 'date', 'counts'] as const;

/** Explicit fields only. Firestore rejects `undefined`, and extra fields would fail the rules. */
export function toBookingDocument(booking: Booking, userId: string) {
  return {
    id: booking.id,
    userId,
    restaurantId: booking.restaurantId,
    restaurantName: booking.restaurantName,
    durationMinutes: booking.durationMinutes,
    cancellationAllowed: booking.cancellationAllowed,
    date: booking.date,
    time: booking.time,
    guestCount: booking.guestCount,
    tableType: booking.tableType,
    tableLabel: booking.tableLabel,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}
