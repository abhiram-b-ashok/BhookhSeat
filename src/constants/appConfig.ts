/** Non-secret app-level constants. */

/** Demo default start times. Each restaurant only offers those inside its opening hours. */
export const SLOT_START_TIMES: readonly string[] = ['12:00', '13:30', '18:00', '19:30', '21:00'];

export const BOOKING_CONFIG = {
  minGuests: 1,
  /** A table must be booked at least this long before the slot starts. */
  minLeadMinutes: 30,
  /** The last bookable start time is this long before closing. */
  lastSeatingBufferMinutes: 30,
} as const;
