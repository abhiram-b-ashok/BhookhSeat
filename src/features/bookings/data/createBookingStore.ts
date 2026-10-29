import type { Restaurant } from '../../restaurants/domain/restaurant.types';
import type { Booking, BookingInput, Result } from '../domain/booking.types';
import { bookingFailure } from '../domain/bookingRules';
import type { OccupancyCounts } from '../domain/occupancy';
import type { PlanId, PlanState } from '../../subscriptions/domain/plans';
import type { BookingBackend } from './bookingBackend';

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

type Options = {
  onError?: (error: unknown) => void;
  generateId?: () => string;
  now?: () => Date;
  /** How long a create/cancel may take before we give up waiting. */
  timeoutMs?: number;
};

const newestFirst = (a: Booking, b: Booking) => b.createdAt.localeCompare(a.createdAt);

const defaultId = () => `bkg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the booking service')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Holds the signed-in user's bookings in memory, kept live by the backend. Screens read it
 * synchronously. Every change of account bumps `generation`; anything that belongs to an
 * older generation (a late snapshot, a slow create) is ignored, so one account's data can
 * never leak into, or be written over, another's.
 */
export function createBookingStore(backend: BookingBackend, options: Options = {}) {
  const reportError = options.onError ?? (() => {});
  const generateId = options.generateId ?? defaultId;
  const getNow = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 20_000;

  let userId: string | null = null;
  let generation = 0;
  let status: StoreStatus = 'idle';
  let serverBookings: Booking[] = [];
  /** Results we know succeeded but the live listener has not shown yet. */
  let overlay = new Map<string, Booking>();
  let bookings: Booking[] = [];
  let unsubscribe: (() => void) | null = null;
  let attached: { userId: string; promise: Promise<void> } | null = null;
  let opQueue: Promise<unknown> = Promise.resolve();
  /** Plan per account. Never shared between accounts, so one person's Premium cannot leak to another. */
  const plans = new Map<string, PlanState>();
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  function recompute() {
    for (const [id, expected] of overlay) {
      const server = serverBookings.find((b) => b.id === id);
      if (server && server.status === expected.status) overlay.delete(id); // server caught up
    }
    const known = new Set(serverBookings.map((b) => b.id));
    const merged = serverBookings.map((b) => overlay.get(b.id) ?? b);
    for (const [id, booking] of overlay) if (!known.has(id)) merged.push(booking);
    bookings = merged.sort(newestFirst);
  }

  /** One create/cancel at a time, so the second always sees the first one's result. */
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = opQueue.then(task, task);
    opQueue = run.catch(() => undefined);
    return run;
  }

  function blockedReason(): Result<never> | null {
    if (!userId) return bookingFailure('NOT_SIGNED_IN');
    if (status === 'loading') return bookingFailure('STILL_LOADING');
    if (status !== 'ready') return bookingFailure('SERVICE_UNAVAILABLE');
    return null;
  }

  async function runOperation(
    task: (uid: string) => Promise<Result<Booking>>,
  ): Promise<Result<Booking>> {
    const gen = generation;
    const uid = userId;
    if (!uid) return bookingFailure('NOT_SIGNED_IN');

    try {
      const result = await withTimeout(task(uid), timeoutMs);
      if (result.ok && gen === generation) {
        overlay.set(result.value.id, result.value);
        recompute();
        emit();
      }
      return result;
    } catch (error) {
      reportError(error);
      return bookingFailure('SERVICE_UNAVAILABLE');
    }
  }

  function hydrate(next: string | null): Promise<void> {
    if (next && attached?.userId === next && status !== 'error') return attached.promise;

    generation += 1;
    const gen = generation;
    unsubscribe?.();
    unsubscribe = null;
    attached = null;
    userId = next;
    serverBookings = [];
    overlay = new Map();
    bookings = [];

    if (!next) {
      plans.clear();
      status = 'idle';
      emit();
      return Promise.resolve();
    }

    status = 'loading';
    emit();

    const promise = new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      try {
        unsubscribe = backend.subscribeToBookings(next, {
          onData(list) {
            if (gen !== generation) return; // a previous account's late snapshot
            serverBookings = list;
            status = 'ready';
            recompute();
            emit();
            settle();
          },
          onError(error) {
            if (gen !== generation) return;
            reportError(error);
            status = 'error';
            emit();
            settle();
          },
        });
      } catch (error) {
        reportError(error);
        status = 'error';
        emit();
        settle();
      }
    });

    attached = { userId: next, promise };
    return promise;
  }

  return {
    getAll(): Booking[] {
      return bookings;
    },

    getStatus(): StoreStatus {
      return status;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Pass the signed-in user's id to start listening, or null on sign-out. Safe to repeat. */
    hydrate,

    /** Tell the store which plan an account is on. Ignored until that account is the active one. */
    setPlan(forUserId: string, state: PlanState): void {
      plans.set(forUserId, state);
    },

    /** Try again after an error. */
    reload(): Promise<void> {
      return userId ? hydrate(userId) : Promise.resolve();
    },

    create(restaurants: Restaurant[], input: BookingInput): Promise<Result<Booking>> {
      const blocked = blockedReason();
      if (blocked) return Promise.resolve(blocked);

      const gen = generation;
      return enqueue(() => {
        if (gen !== generation) return Promise.resolve(bookingFailure('NOT_SIGNED_IN'));
        const planState: PlanState = (userId && plans.get(userId)) || 'unknown';
        const plan: PlanId = planState === 'premium' ? 'premium' : 'free';
        return runOperation(async (uid) => {
          const result = await backend.createBooking({
            userId: uid,
            restaurants,
            input,
            ownBookings: bookings,
            now: getNow(),
            id: generateId(),
            plan,
          });
          // Hitting the Free limit while we are still waiting to hear if they are Premium
          // would be a wrong answer, so say "still loading" instead.
          if (!result.ok && result.error.code === 'BOOKING_LIMIT_REACHED' && planState === 'unknown') {
            return bookingFailure('STILL_LOADING');
          }
          return result;
        });
      });
    },

    cancel(bookingId: string): Promise<Result<Booking>> {
      const blocked = blockedReason();
      if (blocked) return Promise.resolve(blocked);

      const gen = generation;
      return enqueue(() => {
        if (gen !== generation) return Promise.resolve(bookingFailure('NOT_SIGNED_IN'));
        if (!bookings.some((b) => b.id === bookingId)) {
          return Promise.resolve(bookingFailure('BOOKING_NOT_FOUND'));
        }
        return runOperation((uid) =>
          backend.cancelBooking({ userId: uid, bookingId, ownBookings: bookings, now: getNow() }),
        );
      });
    },

    subscribeToOccupancy(
      restaurantId: string,
      date: string,
      handlers: { onData: (counts: OccupancyCounts) => void; onError: (error: unknown) => void },
    ): () => void {
      return backend.subscribeToOccupancy(restaurantId, date, handlers);
    },

    /** Resolves when queued creates/cancels have finished. Mainly for tests. */
    flush(): Promise<unknown> {
      return opQueue;
    },
  };
}

export type BookingStore = ReturnType<typeof createBookingStore>;
