import { restaurantsSeed } from '../features/restaurants/data/restaurants.seed';
import type { BookingBackend } from '../features/bookings/data/bookingBackend';
import { createBookingStore } from '../features/bookings/data/createBookingStore';
import type { Booking, BookingInput, Result } from '../features/bookings/domain/booking.types';
import { planCancel, planCreate } from '../features/bookings/domain/bookingPlans';
import { occupancyDocId, type OccupancyCounts } from '../features/bookings/domain/occupancy';
import { noDemand } from '../features/bookings/domain/simulatedDemand';

const NOW = new Date(2026, 9, 20, 10, 0);
const DATE = '2026-10-21';
const input = (o: Partial<BookingInput> = {}): BookingInput => ({
  restaurantId: 'rest_001', date: DATE, time: '19:30', guestCount: 2, ...o,
});
const make = (id: string, userId: string, o: Partial<Booking> = {}): Booking => ({
  id, userId, restaurantId: 'rest_001', restaurantName: 'Coconut Grove', durationMinutes: 90,
  cancellationAllowed: true, date: DATE, time: '19:30', guestCount: 2, tableType: 'couple',
  tableLabel: 'Couple table', status: 'confirmed', createdAt: `2026-10-20T04:30:0${id.length % 10}.000Z`, ...o,
});
const tick = () => new Promise((r) => setTimeout(r, 0));

/* -------- a backend whose snapshots and results the test controls by hand -------- */
function controlled() {
  type Sub = { userId: string; onData: (l: Booking[]) => void; onError: (e: unknown) => void; active: boolean };
  const subs: Sub[] = [];
  const calls = { create: [] as Parameters<BookingBackend['createBooking']>[0][], cancel: 0 };
  const impl = {
    create: (async () => ({ ok: true, value: make('x', 'u') })) as BookingBackend['createBooking'],
    cancel: (async () => ({ ok: true, value: make('x', 'u') })) as BookingBackend['cancelBooking'],
    subscribeThrows: false,
  };
  const backend: BookingBackend = {
    subscribeToBookings(userId, handlers) {
      if (impl.subscribeThrows) throw new Error('subscribe failed');
      const sub: Sub = { userId, ...handlers, active: true };
      subs.push(sub);
      return () => { sub.active = false; };
    },
    subscribeToOccupancy: () => () => {},
    createBooking: (args) => { calls.create.push(args); return impl.create(args); },
    cancelBooking: (args) => { calls.cancel += 1; return impl.cancel(args); },
  };
  return { backend, subs, impl, calls, last: () => subs[subs.length - 1] };
}

async function signedIn(uid = 'A', options: Parameters<typeof createBookingStore>[1] = {}) {
  const c = controlled();
  const errors: unknown[] = [];
  const store = createBookingStore(c.backend, { now: () => NOW, generateId: () => 'new_id', onError: (e) => errors.push(e), ...options });
  const ready = store.hydrate(uid);
  c.last().onData([]);
  await ready;
  return { ...c, store, errors };
}

describe('loading', () => {
  it('starts idle and signed-out hydrate resolves at once', async () => {
    const { backend } = controlled();
    const store = createBookingStore(backend);
    expect(store.getStatus()).toBe('idle');
    await store.hydrate(null);
    expect(store.getAll()).toEqual([]);
  });

  it('is loading until the first snapshot, then ready and newest first', async () => {
    const c = controlled();
    const store = createBookingStore(c.backend);
    const ready = store.hydrate('A');
    expect(store.getStatus()).toBe('loading');
    c.last().onData([make('old', 'A', { createdAt: '2026-10-01T00:00:00.000Z' }), make('new', 'A', { createdAt: '2026-10-10T00:00:00.000Z' })]);
    await ready;
    expect(store.getStatus()).toBe('ready');
    expect(store.getAll().map((b) => b.id)).toEqual(['new', 'old']);
  });

  it('listens only once for the same user, and again after an error when asked to reload', async () => {
    const { store, subs } = await signedIn('A');
    await store.hydrate('A');
    expect(subs).toHaveLength(1);

    subs[0].onError(new Error('permission-denied'));
    expect(store.getStatus()).toBe('error');
    const again = store.reload();
    subs[1].onData([make('b1', 'A')]);
    await again;
    expect(subs).toHaveLength(2);
    expect(store.getStatus()).toBe('ready');
  });

  it('settles with an error, not a hang, if listening cannot even start', async () => {
    const c = controlled();
    c.impl.subscribeThrows = true;
    const store = createBookingStore(c.backend);
    await store.hydrate('A');
    expect(store.getStatus()).toBe('error');
  });

  it('keeps the same array until something changes', async () => {
    const { store, last } = await signedIn('A');
    const first = store.getAll();
    expect(store.getAll()).toBe(first);
    last().onData([make('b1', 'A')]);
    expect(store.getAll()).not.toBe(first);
  });
});

describe('switching accounts', () => {
  it('clears at once, ignores a late snapshot from the old account, and unsubscribes it', async () => {
    const { store, subs } = await signedIn('A');
    subs[0].onData([make('a1', 'A')]);
    expect(store.getAll()).toHaveLength(1);

    const readyB = store.hydrate('B');
    expect(store.getAll()).toEqual([]); // A's bookings are gone immediately
    expect(subs[0].active).toBe(false);

    subs[0].onData([make('a1', 'A')]); // A's listener fires late
    expect(store.getAll()).toEqual([]);
    expect(store.getStatus()).toBe('loading');

    subs[1].onData([make('b1', 'B')]);
    await readyB;
    expect(store.getAll().map((b) => b.id)).toEqual(['b1']);
  });

  it('ignores a late error from the old account too', async () => {
    const { store, subs } = await signedIn('A');
    store.hydrate('B');
    subs[0].onError(new Error('late'));
    expect(store.getStatus()).toBe('loading');
  });

  it('signing out clears everything and stops listening', async () => {
    const { store, subs } = await signedIn('A');
    subs[0].onData([make('a1', 'A')]);
    await store.hydrate(null);
    expect(store.getAll()).toEqual([]);
    expect(store.getStatus()).toBe('idle');
    expect(subs[0].active).toBe(false);
  });

  it('a slow create from account A finishing after B signs in never touches B', async () => {
    const { store, subs, impl } = await signedIn('A');
    let finish!: (r: Result<Booking>) => void;
    impl.create = () => new Promise((resolve) => { finish = resolve; });

    const pending = store.create(restaurantsSeed, input());
    await tick();
    store.hydrate('B');
    subs[1].onData([]);

    finish({ ok: true, value: make('a_late', 'A') });
    await pending;
    expect(store.getAll()).toEqual([]); // B does not see A's booking
  });
});

describe('creating and cancelling', () => {
  it('refuses clearly when not signed in, still loading, or in error', async () => {
    const c = controlled();
    const store = createBookingStore(c.backend);
    const code = async (p: Promise<Result<Booking>>) => { const r = await p; return r.ok ? null : r.error.code; };

    expect(await code(store.create(restaurantsSeed, input()))).toBe('NOT_SIGNED_IN');
    store.hydrate('A');
    expect(await code(store.create(restaurantsSeed, input()))).toBe('STILL_LOADING');
    c.last().onError(new Error('x'));
    expect(await code(store.create(restaurantsSeed, input()))).toBe('SERVICE_UNAVAILABLE');
    expect(c.calls.create).toHaveLength(0); // the server was never asked
  });

  it('shows a new booking at once, even if the live listener has not caught up', async () => {
    const { store, subs, impl } = await signedIn('A');
    impl.create = async () => ({ ok: true, value: make('n1', 'A') });

    const result = await store.create(restaurantsSeed, input());
    expect(result.ok).toBe(true);
    expect(store.getAll().map((b) => b.id)).toEqual(['n1']);

    subs[0].onData([]); // a stale snapshot from just before the commit
    expect(store.getAll().map((b) => b.id)).toEqual(['n1']);

    subs[0].onData([make('n1', 'A')]); // the server catches up: still exactly one copy
    expect(store.getAll().map((b) => b.id)).toEqual(['n1']);

    subs[0].onData([]); // and once caught up, the server is the source of truth again
    expect(store.getAll()).toEqual([]);
  });

  it('shows a cancellation at once and survives a stale snapshot', async () => {
    const { store, subs, impl } = await signedIn('A');
    subs[0].onData([make('b1', 'A')]);
    impl.cancel = async () => ({ ok: true, value: make('b1', 'A', { status: 'cancelled' }) });

    expect((await store.cancel('b1')).ok).toBe(true);
    expect(store.getAll()[0].status).toBe('cancelled');

    subs[0].onData([make('b1', 'A')]); // stale: still confirmed
    expect(store.getAll()[0].status).toBe('cancelled');

    subs[0].onData([make('b1', 'A', { status: 'cancelled' })]);
    expect(store.getAll()[0].status).toBe('cancelled');
  });

  it('does not bother the server about a booking it does not have', async () => {
    const { store, calls } = await signedIn('A');
    const r = await store.cancel('ghost');
    expect(!r.ok && r.error.code).toBe('BOOKING_NOT_FOUND');
    expect(calls.cancel).toBe(0);
  });

  it('passes a rule failure straight through and changes nothing', async () => {
    const { store, impl } = await signedIn('A');
    impl.create = async () => ({ ok: false, error: { code: 'NO_TABLE_AVAILABLE', message: 'full' } });
    const r = await store.create(restaurantsSeed, input());
    expect(!r.ok && r.error.code).toBe('NO_TABLE_AVAILABLE');
    expect(store.getAll()).toEqual([]);
  });

  it('runs one create at a time, so the second sees the first', async () => {
    const { store, impl, calls } = await signedIn('A');
    let n = 0;
    impl.create = async () => { n += 1; await tick(); return { ok: true, value: make(`n${n}`, 'A') }; };

    const [r1, r2] = await Promise.all([store.create(restaurantsSeed, input()), store.create(restaurantsSeed, input({ time: '12:00' }))]);
    expect(r1.ok && r2.ok).toBe(true);
    expect(calls.create[0].ownBookings).toHaveLength(0);
    expect(calls.create[1].ownBookings.map((b) => b.id)).toEqual(['n1']); // saw the first booking
  });

  it('turns a failing server into a friendly error and keeps working afterwards', async () => {
    const { store, impl, errors } = await signedIn('A');
    impl.create = async () => { throw new Error('unavailable'); };
    const r = await store.create(restaurantsSeed, input());
    expect(!r.ok && r.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(errors).toHaveLength(1);

    impl.create = async () => ({ ok: true, value: make('n1', 'A') });
    expect((await store.create(restaurantsSeed, input())).ok).toBe(true);
  });

  it('gives up if the server takes too long', async () => {
    jest.useFakeTimers();
    try {
      const { store, impl } = await signedIn('A', { timeoutMs: 5000 });
      impl.create = () => new Promise(() => {}); // never answers
      const pending = store.create(restaurantsSeed, input());
      await jest.advanceTimersByTimeAsync(5000);
      const r = await pending;
      expect(!r.ok && r.error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('plans and account isolation', () => {
  const limitFailure = { ok: false as const, error: { code: 'BOOKING_LIMIT_REACHED' as const, message: 'limit' } };
  const codeOf = async (p: Promise<Result<Booking>>) => { const r = await p; return r.ok ? null : r.error.code; };

  it('books as Free until the plan is known', async () => {
    const { store, calls } = await signedIn('A');
    await store.create(restaurantsSeed, input());
    expect(calls.create[0].plan).toBe('free');
  });

  it('passes Premium to the backend once the account is confirmed Premium', async () => {
    const { store, calls } = await signedIn('A');
    store.setPlan('A', 'premium');
    await store.create(restaurantsSeed, input());
    expect(calls.create[0].plan).toBe('premium');
  });

  it('says "still loading", not "limit reached", at the limit while the plan is unknown', async () => {
    const { store, impl } = await signedIn('A');
    impl.create = async () => limitFailure;
    expect(await codeOf(store.create(restaurantsSeed, input()))).toBe('STILL_LOADING');

    store.setPlan('A', 'free'); // now we know for sure
    expect(await codeOf(store.create(restaurantsSeed, input()))).toBe('BOOKING_LIMIT_REACHED');
  });

  it('never lets one account\'s Premium carry over to the next account', async () => {
    const { store, subs, calls } = await signedIn('A');
    store.setPlan('A', 'premium');

    store.hydrate('B');
    subs[1].onData([]);
    await store.create(restaurantsSeed, input());
    expect(calls.create[0].plan).toBe('free'); // B has not been confirmed Premium

    store.setPlan('B', 'premium');
    await store.create(restaurantsSeed, input({ time: '12:00' }));
    expect(calls.create[1].plan).toBe('premium');
  });

  it('forgets every plan on sign-out, so signing back in starts unknown', async () => {
    const { store, subs, calls } = await signedIn('A');
    store.setPlan('A', 'premium');
    await store.hydrate(null);

    store.hydrate('A');
    subs[1].onData([]);
    await store.create(restaurantsSeed, input());
    expect(calls.create[0].plan).toBe('free');
  });

  it('keeps the new account\'s plan when a late update for the old account arrives', async () => {
    const { store, subs, calls } = await signedIn('A');
    store.hydrate('B');
    subs[1].onData([]);
    store.setPlan('B', 'premium');
    store.setPlan('A', 'free'); // late news about the previous account
    await store.create(restaurantsSeed, input());
    expect(calls.create[0].plan).toBe('premium');
  });
});

/* -------- two phones, one server -------- */
function fakeServer() {
  const counts = new Map<string, OccupancyCounts>();
  const mine = new Map<string, Booking[]>();
  const watchers = new Map<string, Set<(l: Booking[]) => void>>();
  let lock: Promise<unknown> = Promise.resolve();

  const notify = (uid: string) => watchers.get(uid)?.forEach((w) => w([...(mine.get(uid) ?? [])]));
  /** Transactions run strictly one after another, like Firestore guarantees for conflicting ones. */
  const transaction = <T,>(work: () => T): Promise<T> => {
    const run = lock.then(async () => { await tick(); return work(); });
    lock = run.catch(() => undefined);
    return run;
  };

  const backend: BookingBackend = {
    subscribeToBookings(uid, { onData }) {
      if (!watchers.has(uid)) watchers.set(uid, new Set());
      watchers.get(uid)!.add(onData);
      onData([...(mine.get(uid) ?? [])]);
      return () => { watchers.get(uid)?.delete(onData); };
    },
    subscribeToOccupancy: () => () => {},
    createBooking: ({ userId, restaurants, input: inp, ownBookings, now, id }) =>
      transaction(() => {
        const docId = occupancyDocId(inp.restaurantId, inp.date);
        const plan = planCreate({ userId, restaurants, input: inp, ownBookings, counts: counts.get(docId) ?? {}, now, id, baseDemand: noDemand });
        if (!plan.ok) return plan;
        counts.set(docId, plan.value.nextCounts);
        mine.set(userId, [plan.value.booking, ...(mine.get(userId) ?? [])]);
        notify(userId);
        return { ok: true as const, value: plan.value.booking };
      }),
    cancelBooking: ({ userId, bookingId, now }) =>
      transaction(() => {
        const stored = (mine.get(userId) ?? []).find((b) => b.id === bookingId);
        if (!stored) return { ok: false as const, error: { code: 'BOOKING_NOT_FOUND' as const, message: 'nf' } };
        const docId = occupancyDocId(stored.restaurantId, stored.date);
        const plan = planCancel({ booking: stored, counts: counts.get(docId) ?? {}, now });
        if (!plan.ok) return plan;
        counts.set(docId, plan.value.nextCounts);
        mine.set(userId, (mine.get(userId) ?? []).map((b) => (b.id === bookingId ? plan.value.booking : b)));
        notify(userId);
        return { ok: true as const, value: plan.value.booking };
      }),
  };
  return { backend, counts };
}

describe('two phones, one server', () => {
  let n = 0;
  const phone = async (uid: string, server: ReturnType<typeof fakeServer>) => {
    const store = createBookingStore(server.backend, { now: () => NOW, generateId: () => `${uid}_${(n += 1)}` });
    await store.hydrate(uid);
    return store;
  };

  it('gives the last family table to only one of two people booking at the same moment', async () => {
    const server = fakeServer();
    server.counts.set(occupancyDocId('rest_001', DATE), { '19:30': { family: 1 } }); // one of two left
    const [alice, bob] = [await phone('alice', server), await phone('bob', server)];

    const [a, b] = await Promise.all([
      alice.create(restaurantsSeed, input({ guestCount: 5 })),
      bob.create(restaurantsSeed, input({ guestCount: 5 })),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const loser = a.ok ? b : a;
    expect(!loser.ok && loser.error.code).toBe('NO_TABLE_AVAILABLE');
    expect(server.counts.get(occupancyDocId('rest_001', DATE))).toEqual({ '19:30': { family: 2 } });
  });

  it('frees the table for the other person after a cancellation', async () => {
    const server = fakeServer();
    server.counts.set(occupancyDocId('rest_001', DATE), { '19:30': { family: 1 } });
    const [alice, bob] = [await phone('alice', server), await phone('bob', server)];

    const first = await alice.create(restaurantsSeed, input({ guestCount: 5 }));
    expect(first.ok).toBe(true);
    expect((await bob.create(restaurantsSeed, input({ guestCount: 5 }))).ok).toBe(false);

    if (first.ok) expect((await alice.cancel(first.value.id)).ok).toBe(true);
    expect((await bob.create(restaurantsSeed, input({ guestCount: 5 }))).ok).toBe(true);
  });

  it('keeps each person\'s bookings private to them', async () => {
    const server = fakeServer();
    const [alice, bob] = [await phone('alice', server), await phone('bob', server)];
    await alice.create(restaurantsSeed, input());
    expect(alice.getAll()).toHaveLength(1);
    expect(bob.getAll()).toHaveLength(0);
  });
});
