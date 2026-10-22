import { BOOKINGS_STORAGE_KEY, serializeBookings } from '../features/bookings/data/bookingStorage';
import {
  createBookingRepository,
  type KeyValueStorage,
} from '../features/bookings/data/createBookingRepository';
import type { Booking } from '../features/bookings/domain/booking.types';

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bkg_1',
  restaurantId: 'rest_001',
  restaurantName: 'Coconut Grove',
  durationMinutes: 90,
  cancellationAllowed: true,
  date: '2026-10-21',
  time: '19:30',
  guestCount: 2,
  tableType: 'couple',
  tableLabel: 'Couple table',
  status: 'confirmed',
  createdAt: '2026-10-20T04:30:00.000Z',
  ...overrides,
});

/** An in-memory stand-in for AsyncStorage that can be told to fail. */
function fakeStorage(initial: string | null = null) {
  const state = {
    value: initial,
    reads: 0,
    writes: [] as string[],
    failRead: false,
    failWrite: false,
    /** While set, reads wait for it, simulating a slow disk. */
    gate: null as Promise<void> | null,
  };
  const storage: KeyValueStorage = {
    async getItem(key) {
      state.reads += 1;
      if (state.gate) await state.gate;
      if (state.failRead) throw new Error('read failed');
      expect(key).toBe(BOOKINGS_STORAGE_KEY);
      return state.value;
    },
    async setItem(key, value) {
      if (state.failWrite) throw new Error('write failed');
      expect(key).toBe(BOOKINGS_STORAGE_KEY);
      state.writes.push(value);
      state.value = value;
    },
  };
  return { storage, state };
}

/** Simulates closing and reopening the app: a brand new repository on the same storage. */
async function restart(state: { value: string | null }) {
  const reopened = fakeStorage(state.value);
  const repo = createBookingRepository(reopened.storage);
  await repo.hydrate();
  return repo;
}

describe('booking repository', () => {
  it('starts empty and writes nothing when there is nothing saved', async () => {
    const { storage, state } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    await repo.flush();
    expect(repo.getAll()).toEqual([]);
    expect(state.writes).toHaveLength(0);
  });

  it('saves a new booking and still has it after the app restarts', async () => {
    const { storage, state } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();

    const booking = makeBooking();
    repo.add(booking);
    await repo.flush();

    const reopened = await restart(state);
    expect(reopened.getAll()).toEqual([booking]);
  });

  it('saves a cancellation across restarts', async () => {
    const { storage, state } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    repo.add(makeBooking());
    repo.update(makeBooking({ status: 'cancelled' }));
    await repo.flush();

    const reopened = await restart(state);
    expect(reopened.getAll().map((b) => b.status)).toEqual(['cancelled']);
  });

  it('clear() empties the saved data too', async () => {
    const { storage, state } = fakeStorage(serializeBookings([makeBooking()]));
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    expect(repo.getAll()).toHaveLength(1);

    repo.clear();
    await repo.flush();

    expect((await restart(state)).getAll()).toEqual([]);
  });

  it('loads existing bookings newest first', async () => {
    const older = makeBooking({ id: 'older', createdAt: '2026-10-01T00:00:00.000Z' });
    const newer = makeBooking({ id: 'newer', createdAt: '2026-10-10T00:00:00.000Z' });
    const { storage } = fakeStorage(serializeBookings([older, newer]));
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    expect(repo.getAll().map((b) => b.id)).toEqual(['newer', 'older']);
  });

  it('only reads storage once, however many times hydrate is called', async () => {
    const { storage, state } = fakeStorage();
    const repo = createBookingRepository(storage);
    await Promise.all([repo.hydrate(), repo.hydrate(), repo.hydrate()]);
    expect(state.reads).toBe(1);
  });

  it('keeps a booking added before loading finished, in memory and on disk', async () => {
    const saved = makeBooking({ id: 'saved' });
    const { storage, state } = fakeStorage(serializeBookings([saved]));
    const repo = createBookingRepository(storage);

    const loading = repo.hydrate();
    repo.add(makeBooking({ id: 'early' })); // added while the read is still in flight
    await loading;
    await repo.flush();

    expect(repo.getAll().map((b) => b.id).sort()).toEqual(['early', 'saved']);
    // The saved booking must not have been overwritten by the early write.
    expect((await restart(state)).getAll().map((b) => b.id).sort()).toEqual(['early', 'saved']);
  });

  it('holds back writes until the slow read has finished', async () => {
    const saved = makeBooking({ id: 'saved' });
    const { storage, state } = fakeStorage(serializeBookings([saved]));
    let release!: () => void;
    state.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repo = createBookingRepository(storage);

    const loading = repo.hydrate(); // read is now stuck waiting on the gate
    repo.add(makeBooking({ id: 'early' }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.writes).toHaveLength(0); // nothing written while the read is pending

    release();
    await loading;
    await repo.flush();

    expect((await restart(state)).getAll().map((b) => b.id).sort()).toEqual(['early', 'saved']);
  });

  it('does not duplicate a booking that is both in memory and in storage', async () => {
    const { storage } = fakeStorage(serializeBookings([makeBooking({ id: 'dup' })]));
    const repo = createBookingRepository(storage);

    const loading = repo.hydrate();
    repo.add(makeBooking({ id: 'dup' }));
    await loading;

    expect(repo.getAll().map((b) => b.id)).toEqual(['dup']);
  });

  it('writes in order, so the last change is what ends up saved', async () => {
    const { storage, state } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();

    repo.add(makeBooking({ id: 'a' }));
    repo.add(makeBooking({ id: 'b' }));
    repo.add(makeBooking({ id: 'c' }));
    await repo.flush();

    expect(state.writes).toHaveLength(3);
    expect((await restart(state)).getAll().map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });

  it('does not overwrite saved data it could not read', async () => {
    const original = serializeBookings([makeBooking({ id: 'precious' })]);
    const { storage, state } = fakeStorage(original);
    state.failRead = true;
    const errors: unknown[] = [];
    const repo = createBookingRepository(storage, { onError: (e) => errors.push(e) });

    await repo.hydrate();
    repo.add(makeBooking({ id: 'new' }));
    await repo.flush();

    expect(errors).toHaveLength(1);
    expect(repo.getAll().map((b) => b.id)).toEqual(['new']); // the app still works in memory
    expect(state.writes).toHaveLength(0);
    expect(state.value).toBe(original); // the saved bookings are untouched
  });

  it('survives a failed write and keeps saving later changes', async () => {
    const { storage, state } = fakeStorage();
    const errors: unknown[] = [];
    const repo = createBookingRepository(storage, { onError: (e) => errors.push(e) });
    await repo.hydrate();

    state.failWrite = true;
    repo.add(makeBooking({ id: 'first' }));
    await repo.flush();
    expect(errors).toHaveLength(1);
    expect(repo.getAll()).toHaveLength(1); // still in memory

    state.failWrite = false;
    repo.add(makeBooking({ id: 'second' }));
    await repo.flush();
    expect((await restart(state)).getAll().map((b) => b.id)).toEqual(['second', 'first']);
  });

  it('recovers from corrupt saved data', async () => {
    const { storage } = fakeStorage('{{{corrupt');
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    expect(repo.getAll()).toEqual([]);
    repo.add(makeBooking());
    await repo.flush();
    expect(repo.getAll()).toHaveLength(1);
  });

  it('notifies subscribers on change until they unsubscribe', async () => {
    const { storage } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();

    let calls = 0;
    const unsubscribe = repo.subscribe(() => {
      calls += 1;
    });
    repo.add(makeBooking({ id: 'a' }));
    repo.update(makeBooking({ id: 'a', status: 'cancelled' }));
    expect(calls).toBe(2);

    unsubscribe();
    repo.add(makeBooking({ id: 'b' }));
    expect(calls).toBe(2);
  });

  it('returns the same array reference until something changes', async () => {
    const { storage } = fakeStorage();
    const repo = createBookingRepository(storage);
    await repo.hydrate();
    repo.add(makeBooking());
    const first = repo.getAll();
    expect(repo.getAll()).toBe(first);
    repo.add(makeBooking({ id: 'other' }));
    expect(repo.getAll()).not.toBe(first);
  });
});
