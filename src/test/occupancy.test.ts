import type { Booking } from '../features/bookings/domain/booking.types';
import {
  adjustCounts,
  buildSharedDemand,
  occupancyDocId,
  parseOccupancyCounts,
} from '../features/bookings/domain/occupancy';
import { noDemand } from '../features/bookings/domain/simulatedDemand';

const own = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1', userId: 'u1', restaurantId: 'rest_001', restaurantName: 'Coconut Grove', durationMinutes: 90,
  cancellationAllowed: true, date: '2026-10-21', time: '19:30', guestCount: 2, tableType: 'couple',
  tableLabel: 'Couple table', status: 'confirmed', createdAt: '2026-10-20T04:30:00.000Z', ...overrides,
});

describe('occupancyDocId', () => {
  it('combines restaurant and date', () => {
    expect(occupancyDocId('rest_001', '2026-10-21')).toBe('rest_001_2026-10-21');
  });
});

describe('adjustCounts', () => {
  it('adds and removes without changing the original', () => {
    const start = {};
    const one = adjustCounts(start, '19:30', 'couple', +1);
    expect(one).toEqual({ '19:30': { couple: 1 } });
    expect(start).toEqual({});
    expect(adjustCounts(one, '19:30', 'couple', +1)).toEqual({ '19:30': { couple: 2 } });
  });

  it('keeps other slots and table types untouched', () => {
    const counts = { '12:00': { standard: 2 }, '19:30': { couple: 1, family: 1 } };
    expect(adjustCounts(counts, '19:30', 'couple', +1)).toEqual({
      '12:00': { standard: 2 },
      '19:30': { couple: 2, family: 1 },
    });
  });

  it('never goes below zero', () => {
    expect(adjustCounts({}, '19:30', 'couple', -1)).toEqual({});
    expect(adjustCounts({ '19:30': { couple: 1 } }, '19:30', 'couple', -5)).toEqual({});
  });

  it('removes empty entries so the document stays small', () => {
    const counts = { '19:30': { couple: 1, family: 1 } };
    expect(adjustCounts(counts, '19:30', 'couple', -1)).toEqual({ '19:30': { family: 1 } });
    expect(adjustCounts({ '19:30': { couple: 1 } }, '19:30', 'couple', -1)).toEqual({});
  });
});

describe('parseOccupancyCounts', () => {
  it('keeps valid entries', () => {
    expect(parseOccupancyCounts({ '19:30': { couple: 2, standard: 1 } })).toEqual({
      '19:30': { couple: 2, standard: 1 },
    });
  });

  it('never throws and drops anything malformed', () => {
    expect(parseOccupancyCounts(undefined)).toEqual({});
    expect(parseOccupancyCounts(null)).toEqual({});
    expect(parseOccupancyCounts('x')).toEqual({});
    expect(parseOccupancyCounts([1, 2])).toEqual({});
    expect(
      parseOccupancyCounts({
        '25:99': { couple: 1 }, // not a time
        'later': { couple: 1 },
        '19:30': { couple: -2, standard: 1.5, sofa: 3, family: 'two', large_group: 1 },
        '20:00': null,
      }),
    ).toEqual({ '19:30': { large_group: 1 } });
  });
});

describe('buildSharedDemand', () => {
  const args = { restaurantId: 'rest_001', date: '2026-10-21', baseDemand: noDemand };

  it('adds real bookings by other people on top of the base demand', () => {
    const demand = buildSharedDemand({ ...args, counts: { '19:30': { couple: 2 } }, ownBookings: [] });
    expect(demand('rest_001', '2026-10-21', '19:30', 'couple', 4)).toBe(2);
    expect(demand('rest_001', '2026-10-21', '19:30', 'standard', 5)).toBe(0);
    expect(demand('rest_001', '2026-10-21', '12:00', 'couple', 4)).toBe(0);
  });

  it('does not count the user\'s own booking twice', () => {
    // counts hold 2 couple tables: one is ours, so only 1 belongs to someone else.
    const demand = buildSharedDemand({ ...args, counts: { '19:30': { couple: 2 } }, ownBookings: [own()] });
    expect(demand('rest_001', '2026-10-21', '19:30', 'couple', 4)).toBe(1);
  });

  it('ignores a cancelled own booking when subtracting', () => {
    const demand = buildSharedDemand({
      ...args,
      counts: { '19:30': { couple: 1 } },
      ownBookings: [own({ status: 'cancelled' })],
    });
    expect(demand('rest_001', '2026-10-21', '19:30', 'couple', 4)).toBe(1);
  });

  it('never goes negative when the counts lag behind', () => {
    const demand = buildSharedDemand({ ...args, counts: {}, ownBookings: [own()] });
    expect(demand('rest_001', '2026-10-21', '19:30', 'couple', 4)).toBe(0);
  });

  it('is capped at the number of tables', () => {
    const demand = buildSharedDemand({ ...args, counts: { '19:30': { couple: 99 } }, ownBookings: [] });
    expect(demand('rest_001', '2026-10-21', '19:30', 'couple', 4)).toBe(4);
  });

  it('only applies to the restaurant and date it was built for', () => {
    const demand = buildSharedDemand({ ...args, counts: { '19:30': { couple: 3 } }, ownBookings: [] });
    expect(demand('rest_002', '2026-10-21', '19:30', 'couple', 4)).toBe(0);
    expect(demand('rest_001', '2026-10-22', '19:30', 'couple', 4)).toBe(0);
  });
});
