import type { Booking } from '../domain/booking.types';
import { BOOKINGS_STORAGE_KEY, parseStoredBookings, serializeBookings } from './bookingStorage';

/** The small part of AsyncStorage we use. Tests pass in a fake. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type Options = { onError?: (error: unknown) => void };

const newestFirst = (a: Booking, b: Booking) => b.createdAt.localeCompare(a.createdAt);

/**
 * Reads are instant and synchronous (from memory) so screens stay simple. Every change is
 * written through to storage in the background, strictly in order.
 */
export function createBookingRepository(storage: KeyValueStorage, options: Options = {}) {
  const reportError = options.onError ?? (() => {});

  let bookings: Booking[] = [];
  const listeners = new Set<() => void>();
  let hydration: Promise<void> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();
  // If we could not READ saved data, writing would overwrite it. Better to lose this
  // session's changes than to destroy bookings we could not see.
  let readFailed = false;

  const emit = () => listeners.forEach((listener) => listener());

  function persist() {
    writeQueue = writeQueue
      // Never write before the saved data has been read, or we would replace it.
      .then(() => hydration)
      .then(() => {
        if (readFailed) return;
        // Save the latest state at write time, so a queued write is never stale.
        return storage.setItem(BOOKINGS_STORAGE_KEY, serializeBookings(bookings));
      })
      .catch(reportError);
  }

  function commit(next: Booking[]) {
    bookings = next;
    emit();
    persist();
  }

  return {
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
      commit([booking, ...bookings]);
    },

    update(updated: Booking): void {
      commit(bookings.map((b) => (b.id === updated.id ? updated : b)));
    },

    clear(): void {
      commit([]);
    },

    /** Loads saved bookings once. Safe to call repeatedly and never rejects. */
    hydrate(): Promise<void> {
      if (!hydration) {
        hydration = (async () => {
          try {
            const stored = parseStoredBookings(await storage.getItem(BOOKINGS_STORAGE_KEY));
            if (stored.length > 0) {
              const known = new Set(bookings.map((b) => b.id));
              bookings = [...bookings, ...stored.filter((b) => !known.has(b.id))].sort(newestFirst);
              emit();
            }
          } catch (error) {
            readFailed = true;
            reportError(error);
          }
        })();
      }
      return hydration;
    },

    /** Resolves once every queued write has finished. Mainly for tests. */
    flush(): Promise<void> {
      return writeQueue;
    },
  };
}

export type BookingRepository = ReturnType<typeof createBookingRepository>;
