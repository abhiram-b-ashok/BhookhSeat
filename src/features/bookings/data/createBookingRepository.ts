import type { Booking } from '../domain/booking.types';
import {
  BOOKINGS_STORAGE_KEY,
  getBookingsStorageKey,
  parseStoredBookings,
  serializeBookings,
} from './bookingStorage';

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

  let currentUserId: string | null = null;
  let currentStorageKey: string = BOOKINGS_STORAGE_KEY;
  let bookings: Booking[] = [];
  const listeners = new Set<() => void>();
  let hydration: Promise<void> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();
  // If we could not READ saved data, writing would overwrite it. Better to lose this
  // session's changes than to destroy bookings we could not see.
  let readFailed = false;

  const emit = () => listeners.forEach((listener) => listener());

  function persist(targetKey: string) {
    writeQueue = writeQueue
      // Never write before the saved data has been read, or we would replace it.
      .then(() => hydration)
      .then(() => {
        if (readFailed) return;
        // Save the latest state at write time, so a queued write is never stale.
        return storage.setItem(targetKey, serializeBookings(bookings));
      })
      .catch(reportError);
  }

  function commit(next: Booking[]) {
    bookings = next;
    emit();
    persist(currentStorageKey);
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
      const enriched =
        currentUserId && !booking.userId ? { ...booking, userId: currentUserId } : booking;
      commit([enriched, ...bookings]);
    },

    update(updated: Booking): void {
      commit(bookings.map((b) => (b.id === updated.id ? updated : b)));
    },

    clear(): void {
      commit([]);
    },

    reset(): void {
      currentUserId = null;
      currentStorageKey = BOOKINGS_STORAGE_KEY;
      bookings = [];
      hydration = null;
      readFailed = false;
      emit();
    },

    /** Loads saved bookings. Pass userId to scope bookings to that user account. Safe to call repeatedly. */
    hydrate(userId?: string | null): Promise<void> {
      // Unspecified userId preserves legacy/default behavior (used in base unit tests)
      if (userId === undefined) {
        if (!hydration) {
          hydration = (async () => {
            try {
              const stored = parseStoredBookings(await storage.getItem(currentStorageKey));
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
      }

      // Signed out: reset in-memory state
      if (userId === null) {
        currentUserId = null;
        currentStorageKey = BOOKINGS_STORAGE_KEY;
        bookings = [];
        hydration = Promise.resolve();
        readFailed = false;
        emit();
        return hydration;
      }

      // Same user already hydrated
      if (currentUserId === userId && hydration) {
        return hydration;
      }

      currentUserId = userId;
      currentStorageKey = getBookingsStorageKey(userId);
      readFailed = false;

      // Clear memory immediately when switching accounts
      bookings = [];
      emit();

      // Ensure any pending writes for previous account finish before reading
      hydration = writeQueue.then(async () => {
        try {
          const stored = parseStoredBookings(await storage.getItem(currentStorageKey));
          const known = new Set(bookings.map((b) => b.id));
          bookings = [...bookings, ...stored.filter((b) => !known.has(b.id))].sort(newestFirst);
          emit();
        } catch (error) {
          readFailed = true;
          reportError(error);
        }
      });

      return hydration;
    },

    /** Resolves once every queued write has finished. Mainly for tests. */
    flush(): Promise<void> {
      return writeQueue;
    },
  };
}

export type BookingRepository = ReturnType<typeof createBookingRepository>;
