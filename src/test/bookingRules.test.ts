import { restaurantsSeed } from '../features/restaurants/data/restaurants.seed';
import type { Restaurant } from '../features/restaurants/domain/restaurant.types';
import type { Booking, BookingInput } from '../features/bookings/domain/booking.types';
import {
  buildBooking,
  cancelBooking,
  countFreeTables,
  findFirstBookableDate,
  getBookableDates,
  getCandidateTimes,
  getDisplayStatus,
  getMaxGuests,
  getSlots,
  partitionBookings,
} from '../features/bookings/domain/bookingRules';
import {
  noDemand,
  simulatedDemand,
  type DemandFn,
} from '../features/bookings/domain/simulatedDemand';

/* Fixed "now": Tuesday 20 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 20, 10, 0);
const WED = '2026-10-21';

const restaurant = (id: string): Restaurant => {
  const found = restaurantsSeed.find((r) => r.id === id);
  if (!found) throw new Error(`Missing seed restaurant ${id}`);
  return found;
};

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bkg_existing',
  restaurantId: 'rest_001',
  restaurantName: 'Coconut Grove',
  durationMinutes: 90,
  cancellationAllowed: true,
  date: WED,
  time: '19:30',
  guestCount: 2,
  tableType: 'couple',
  tableLabel: 'Couple table',
  status: 'confirmed',
  createdAt: NOW.toISOString(),
  ...overrides,
});

const input = (overrides: Partial<BookingInput> = {}): BookingInput => ({
  restaurantId: 'rest_001',
  date: WED,
  time: '19:30',
  guestCount: 2,
  ...overrides,
});

function book(
  overrides: Partial<BookingInput> = {},
  options: { existing?: Booking[]; now?: Date; demand?: DemandFn; restaurants?: Restaurant[] } = {},
) {
  return buildBooking({
    restaurants: options.restaurants ?? restaurantsSeed,
    input: input(overrides),
    existingBookings: options.existing ?? [],
    now: options.now ?? NOW,
    id: 'bkg_new',
    demand: options.demand ?? noDemand,
  });
}

const errorCode = (result: ReturnType<typeof book>) => (result.ok ? null : result.error.code);

/* ------------------------------------------------------------------ */

describe('guest limits', () => {
  it('uses the largest table as the maximum party size', () => {
    expect(getMaxGuests(restaurant('rest_001'))).toBe(6);
    expect(getMaxGuests(restaurant('rest_002'))).toBe(8);
    expect(getMaxGuests(restaurant('rest_003'))).toBe(4);
  });

  it.each([0, -1, 2.5, 7, NaN])('rejects %p guests at a 6-seat-max restaurant', (guestCount) => {
    expect(errorCode(book({ guestCount }))).toBe('INVALID_GUEST_COUNT');
  });

  it('accepts 1 guest and the maximum party', () => {
    expect(book({ guestCount: 1 }).ok).toBe(true);
    expect(book({ guestCount: 6 }).ok).toBe(true);
  });
});

describe('opening hours and slot times', () => {
  it('offers every default slot when the restaurant is open late', () => {
    expect(getCandidateTimes(restaurant('rest_001'), WED)).toEqual([
      '12:00', '13:30', '18:00', '19:30', '21:00',
    ]);
  });

  it('drops the last slot when it is too close to closing (Olive & Thyme closes 21:00)', () => {
    expect(getCandidateTimes(restaurant('rest_003'), WED)).toEqual([
      '12:00', '13:30', '18:00', '19:30',
    ]);
  });

  it('allows a start exactly at the last-seating limit (Berry & Batter closes 20:00)', () => {
    expect(getCandidateTimes(restaurant('rest_008'), WED)).toContain('19:30');
    expect(getCandidateTimes(restaurant('rest_008'), WED)).not.toContain('21:00');
  });

  it('rejects a slot outside opening hours', () => {
    expect(errorCode(book({ restaurantId: 'rest_003', time: '21:00' }))).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('rejects times that are not valid or not bookable start times', () => {
    expect(errorCode(book({ time: '25:00' }))).toBe('INVALID_TIME');
    expect(errorCode(book({ time: '19:45' }))).toBe('INVALID_TIME');
    expect(errorCode(book({ time: '' }))).toBe('INVALID_TIME');
  });
});

describe('dates', () => {
  it('lists today through the advance-booking limit', () => {
    const dates = getBookableDates(restaurant('rest_001'), NOW);
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-10-20');
    expect(dates[30]).toBe('2026-11-19');
    expect(getBookableDates(restaurant('rest_003'), NOW)).toHaveLength(22);
  });

  it('rejects malformed and impossible dates', () => {
    expect(errorCode(book({ date: '21/10/2026' }))).toBe('INVALID_DATE');
    expect(errorCode(book({ date: '2026-02-31' }))).toBe('INVALID_DATE');
    expect(errorCode(book({ date: '2026-13-01' }))).toBe('INVALID_DATE');
  });

  it('rejects dates in the past', () => {
    expect(errorCode(book({ date: '2026-10-19' }))).toBe('DATE_IN_PAST');
  });

  it('allows the last day of the window and rejects the day after', () => {
    expect(book({ date: '2026-11-19' }).ok).toBe(true);
    expect(errorCode(book({ date: '2026-11-20' }))).toBe('TOO_FAR_AHEAD');
  });

  it('uses each restaurant\'s own advance limit (Olive & Thyme: 21 days)', () => {
    expect(book({ restaurantId: 'rest_003', date: '2026-11-10' }).ok).toBe(true);
    expect(errorCode(book({ restaurantId: 'rest_003', date: '2026-11-11' }))).toBe('TOO_FAR_AHEAD');
  });

  it('rejects a slot that is too soon, but allows exactly the minimum lead time', () => {
    const today = '2026-10-20';
    expect(errorCode(book({ date: today, time: '12:00' }, { now: new Date(2026, 9, 20, 11, 45) }))).toBe('TOO_SOON');
    expect(book({ date: today, time: '12:00' }, { now: new Date(2026, 9, 20, 11, 30) }).ok).toBe(true);
  });
});

describe('restaurant reference', () => {
  it('rejects an unknown restaurant id', () => {
    expect(errorCode(book({ restaurantId: 'rest_999' }))).toBe('RESTAURANT_NOT_FOUND');
  });
});

describe('table assignment', () => {
  it('seats the party at the smallest table that fits', () => {
    const tableFor = (guestCount: number, restaurantId = 'rest_001') => {
      const result = book({ guestCount, restaurantId });
      return result.ok ? result.value.tableType : null;
    };
    expect(tableFor(1)).toBe('couple');
    expect(tableFor(2)).toBe('couple');
    expect(tableFor(3)).toBe('standard');
    expect(tableFor(4)).toBe('standard');
    expect(tableFor(5)).toBe('family');
    expect(tableFor(7, 'rest_002')).toBe('large_group');
  });

  it('creates a confirmed booking with snapshots of the restaurant details', () => {
    const result = book();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: 'bkg_new',
      restaurantId: 'rest_001',
      restaurantName: 'Coconut Grove',
      durationMinutes: 90,
      cancellationAllowed: true,
      date: WED,
      time: '19:30',
      guestCount: 2,
      tableType: 'couple',
      status: 'confirmed',
    });
    expect(result.value.createdAt).toBe(NOW.toISOString());
  });

  it('moves a small party to a bigger table when the small tables are full', () => {
    const couplesFull: DemandFn = (_r, _d, _t, type, total) => (type === 'couple' ? total : 0);
    const result = book({ guestCount: 2 }, { demand: couplesFull });
    expect(result.ok && result.value.tableType).toBe('standard');
  });

  it('refuses the booking when every suitable table is taken', () => {
    const everythingFull: DemandFn = (_r, _d, _t, _type, total) => total;
    expect(errorCode(book({}, { demand: everythingFull }))).toBe('NO_TABLE_AVAILABLE');
  });

  it('does not use too-small tables for a big party', () => {
    const onlyFamilyFull: DemandFn = (_r, _d, _t, type, total) => (type === 'family' ? total : 0);
    expect(errorCode(book({ guestCount: 5 }, { demand: onlyFamilyFull }))).toBe('NO_TABLE_AVAILABLE');
  });
});

describe('capacity', () => {
  const free = (existing: Booking[]) =>
    countFreeTables(restaurant('rest_001'), WED, '19:30', existing, noDemand);

  it('has every table free with no bookings', () => {
    expect(free([])).toEqual({ couple: 4, standard: 5, family: 2 });
  });

  it('a confirmed booking uses up one table of its type', () => {
    expect(free([makeBooking()])).toEqual({ couple: 3, standard: 5, family: 2 });
  });

  it('cancelling a booking releases its table', () => {
    expect(free([makeBooking({ status: 'cancelled' })])).toEqual({ couple: 4, standard: 5, family: 2 });
  });

  it('ignores bookings on other dates and at other restaurants', () => {
    expect(free([makeBooking({ date: '2026-10-22' }), makeBooking({ restaurantId: 'rest_002' })])).toEqual({
      couple: 4,
      standard: 5,
      family: 2,
    });
  });

  it('counts the busiest moment, not every booking that touches the window', () => {
    // Saffron Sky: 105-minute sittings. A 19:30 booking runs 19:30-21:15 and overlaps both
    // the 18:00 sitting (ends 19:45) and the 21:00 sitting. Those two never sit at the same
    // time, so only 2 couple tables are in use at once, not 4.
    const demand: DemandFn = (_r, _d, time, type) =>
      type === 'couple' && (time === '18:00' || time === '21:00') ? 2 : 0;
    const result = countFreeTables(restaurant('rest_007'), WED, '19:30', [], demand);
    expect(result.couple).toBe(2);
    expect(result.standard).toBe(5);
  });
});

describe('slot availability', () => {
  const slots = (opts: { now?: Date; existing?: Booking[]; demand?: DemandFn; date?: string } = {}) =>
    getSlots({
      restaurant: restaurant('rest_001'),
      date: opts.date ?? '2026-10-20',
      guestCount: 2,
      existingBookings: opts.existing ?? [],
      now: opts.now ?? NOW,
      demand: opts.demand ?? noDemand,
    });

  it('marks everything available on a quiet day', () => {
    expect(slots().map((s) => s.status)).toEqual(Array(5).fill('available'));
  });

  it('marks slots that have passed or start too soon', () => {
    const result = slots({ now: new Date(2026, 9, 20, 12, 45) });
    expect(result.map((s) => s.status)).toEqual([
      'too_soon', 'available', 'available', 'available', 'available',
    ]);
  });

  it('marks slots that clash with the user\'s own booking, but not back-to-back ones', () => {
    // Existing booking 19:30-21:00. The 18:00 sitting ends at 19:30 and the 21:00 starts at 21:00.
    const result = slots({ date: WED, existing: [makeBooking()] });
    expect(result.map((s) => `${s.time}:${s.status}`)).toEqual([
      '12:00:available', '13:30:available', '18:00:available', '19:30:conflict', '21:00:available',
    ]);
  });

  it('frees the slot again after the booking is cancelled', () => {
    const result = slots({ date: WED, existing: [makeBooking({ status: 'cancelled' })] });
    expect(result.every((s) => s.status === 'available')).toBe(true);
  });

  it('reports a full slot', () => {
    const full: DemandFn = (_r, _d, time, _type, total) => (time === '18:00' ? total : 0);
    const result = slots({ demand: full });
    expect(result.find((s) => s.time === '18:00')?.status).toBe('full');
    expect(result.find((s) => s.time === '19:30')?.status).toBe('available');
  });

  it('reports the assigned table on available slots only', () => {
    const result = slots();
    expect(result[0].tableType).toBe('couple');
    const full = slots({ demand: (_r, _d, _t, _type, total) => total });
    expect(full[0].tableType).toBeNull();
  });
});

describe('finding the first bookable date', () => {
  const find = (now: Date, demand: DemandFn = noDemand) =>
    findFirstBookableDate({
      restaurant: restaurant('rest_001'),
      guestCount: 2,
      existingBookings: [],
      now,
      demand,
    });

  it('is today when something is still bookable', () => {
    expect(find(NOW)).toBe('2026-10-20');
  });

  it('skips to tomorrow when every slot today has passed', () => {
    expect(find(new Date(2026, 9, 20, 21, 0))).toBe('2026-10-21');
  });

  it('is null when nothing is available at all', () => {
    expect(find(NOW, (_r, _d, _t, _type, total) => total)).toBeNull();
  });
});

describe('conflicts with the user\'s other bookings', () => {
  it('blocks a booking at the same restaurant and time', () => {
    expect(errorCode(book({}, { existing: [makeBooking()] }))).toBe('BOOKING_CONFLICT');
  });

  it('blocks an overlapping booking at a different restaurant', () => {
    expect(errorCode(book({ restaurantId: 'rest_002' }, { existing: [makeBooking()] }))).toBe('BOOKING_CONFLICT');
  });

  it('allows a booking that starts exactly when the other one ends', () => {
    // Coconut Grove 19:30 + 90 minutes = 21:00
    expect(book({ restaurantId: 'rest_002', time: '21:00' }, { existing: [makeBooking()] }).ok).toBe(true);
  });

  it('uses the other booking\'s own duration (105-minute sitting blocks a 19:30 start)', () => {
    const long = makeBooking({ restaurantId: 'rest_007', durationMinutes: 105, time: '18:00' }); // until 19:45
    expect(errorCode(book({ time: '19:30' }, { existing: [long] }))).toBe('BOOKING_CONFLICT');
  });

  it('ignores cancelled bookings', () => {
    expect(book({}, { existing: [makeBooking({ status: 'cancelled' })] }).ok).toBe(true);
  });
});

describe('cancellation', () => {
  const now = NOW;

  it('returns a cancelled copy of the booking', () => {
    const original = makeBooking();
    const result = cancelBooking([original], original.id, now);
    expect(result.ok && result.value.status).toBe('cancelled');
    expect(original.status).toBe('confirmed'); // the original is not mutated
  });

  it('rejects an unknown booking', () => {
    const result = cancelBooking([makeBooking()], 'nope', now);
    expect(!result.ok && result.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('rejects a booking that is already cancelled', () => {
    const b = makeBooking({ status: 'cancelled' });
    const result = cancelBooking([b], b.id, now);
    expect(!result.ok && result.error.code).toBe('ALREADY_CANCELLED');
  });

  it('rejects when the restaurant does not allow cancellation', () => {
    const b = makeBooking({ cancellationAllowed: false });
    const result = cancelBooking([b], b.id, now);
    expect(!result.ok && result.error.code).toBe('CANCELLATION_NOT_ALLOWED');
  });

  it('rejects once the booking has started', () => {
    const b = makeBooking({ date: '2026-10-20', time: '12:00' });
    const result = cancelBooking([b], b.id, new Date(2026, 9, 20, 13, 0));
    expect(!result.ok && result.error.code).toBe('BOOKING_STARTED');
  });
});

describe('upcoming and past bookings', () => {
  const upcomingLate = makeBooking({ id: 'a', date: '2026-10-25' });
  const upcomingSoon = makeBooking({ id: 'b', date: '2026-10-21' });
  const finished = makeBooking({ id: 'c', date: '2026-10-19' });
  const cancelled = makeBooking({ id: 'd', date: '2026-10-22', status: 'cancelled' });

  it('derives the display status', () => {
    expect(getDisplayStatus(upcomingSoon, NOW)).toBe('confirmed');
    expect(getDisplayStatus(finished, NOW)).toBe('completed');
    expect(getDisplayStatus(cancelled, NOW)).toBe('cancelled');
  });

  it('keeps a booking that is currently in progress as upcoming', () => {
    const inProgress = makeBooking({ date: '2026-10-20', time: '12:00' }); // until 13:30
    expect(getDisplayStatus(inProgress, new Date(2026, 9, 20, 13, 0))).toBe('confirmed');
    expect(getDisplayStatus(inProgress, new Date(2026, 9, 20, 13, 30))).toBe('completed');
  });

  it('splits and sorts them', () => {
    const { upcoming, past } = partitionBookings([upcomingLate, finished, cancelled, upcomingSoon], NOW);
    expect(upcoming.map((b) => b.id)).toEqual(['b', 'a']); // soonest first
    expect(past.map((b) => b.id)).toEqual(['d', 'c']); // most recent first
  });
});

describe('simulated demand', () => {
  it('is deterministic', () => {
    expect(simulatedDemand('rest_001', WED, '19:30', 'couple', 4)).toBe(
      simulatedDemand('rest_001', WED, '19:30', 'couple', 4),
    );
  });

  it('stays between 0 and the number of tables, and produces a realistic mix', () => {
    const values = new Set<number>();
    for (let day = 1; day <= 60; day++) {
      const date = `2026-12-${String(day).padStart(2, '0')}`;
      const v = simulatedDemand('rest_001', date, '19:30', 'couple', 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(4);
      values.add(v);
    }
    expect(values.has(0)).toBe(true);
    expect(values.has(4)).toBe(true);
  });

  it('never makes the booking logic throw, whatever the demand is', () => {
    const results = getBookableDates(restaurant('rest_001'), NOW).map((date) =>
      getSlots({
        restaurant: restaurant('rest_001'),
        date,
        guestCount: 2,
        existingBookings: [],
        now: NOW,
      }),
    );
    const statuses = new Set(results.flat().map((s) => s.status));
    expect(statuses.has('available')).toBe(true);
    expect(statuses.has('full')).toBe(true);
  });
});
