import type { Booking } from '../domain/booking.types';

/**
 * In-memory store for now: bookings last until the app is closed. Phase 4 keeps this exact
 * shape and adds saving to / loading from device storage, so no screen needs to change.
 */
let bookings: Booking[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const bookingRepository = {
  /** Returns the same array until something changes, which useSyncExternalStore relies on. */
  getAll(): Booking[] {
    return bookings;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  add(booking: Booking): void {
    bookings = [booking, ...bookings];
    emit();
  },

  update(updated: Booking): void {
    bookings = bookings.map((b) => (b.id === updated.id ? updated : b));
    emit();
  },
};
