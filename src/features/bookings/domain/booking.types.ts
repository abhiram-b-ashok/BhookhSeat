import type { TableType } from '../../restaurants/domain/restaurant.types';

/**
 * Only two statuses are stored. "Completed" is derived from the date, so
 * nothing has to update a booking after the meal time has passed.
 */
export type BookingStatus = 'confirmed' | 'cancelled';

export type Booking = {
  id: string;
  restaurantId: string;
  /** Snapshots, so the booking still displays correctly if restaurant data changes. */
  restaurantName: string;
  durationMinutes: number;
  cancellationAllowed: boolean;
  /** "YYYY-MM-DD", local time. */
  date: string;
  /** "HH:mm", local time. */
  time: string;
  guestCount: number;
  tableType: TableType;
  tableLabel: string;
  status: BookingStatus;
  /** ISO timestamp. */
  createdAt: string;
};

export type BookingInput = {
  restaurantId: string;
  date: string;
  time: string;
  guestCount: number;
};

export type BookingErrorCode =
  | 'RESTAURANT_NOT_FOUND'
  | 'INVALID_GUEST_COUNT'
  | 'INVALID_DATE'
  | 'DATE_IN_PAST'
  | 'TOO_FAR_AHEAD'
  | 'INVALID_TIME'
  | 'OUTSIDE_OPENING_HOURS'
  | 'TOO_SOON'
  | 'BOOKING_CONFLICT'
  | 'NO_TABLE_AVAILABLE'
  | 'BOOKING_NOT_FOUND'
  | 'ALREADY_CANCELLED'
  | 'CANCELLATION_NOT_ALLOWED'
  | 'BOOKING_STARTED';

export type BookingError = { code: BookingErrorCode; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: BookingError };

export type SlotStatus = 'available' | 'full' | 'too_soon' | 'conflict';

export type SlotInfo = {
  time: string;
  status: SlotStatus;
  /** The table that would be assigned. Only set when status is "available". */
  tableType: TableType | null;
};

/** "confirmed" = upcoming, "completed" = a confirmed booking whose time has passed. */
export type DisplayStatus = 'confirmed' | 'cancelled' | 'completed';
