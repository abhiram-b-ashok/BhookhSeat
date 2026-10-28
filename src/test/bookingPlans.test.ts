import { restaurantsSeed } from '../features/restaurants/data/restaurants.seed';
import type { Booking, BookingInput } from '../features/bookings/domain/booking.types';
import { planCancel, planCreate } from '../features/bookings/domain/bookingPlans';
import type { OccupancyCounts } from '../features/bookings/domain/occupancy';
import { noDemand } from '../features/bookings/domain/simulatedDemand';

const NOW = new Date(2026, 9, 20, 10, 0); // Tue 20 Oct 2026, 10:00
const DATE = '2026-10-21';
const input = (o: Partial<BookingInput> = {}): BookingInput => ({
  restaurantId: 'rest_001', date: DATE, time: '19:30', guestCount: 2, ...o,
});

let seq = 0;
function create(userId: string, counts: OccupancyCounts, o: Partial<BookingInput> = {}, own: Booking[] = []) {
  seq += 1;
  return planCreate({
    userId, restaurants: restaurantsSeed, input: input(o), ownBookings: own, counts, now: NOW,
    id: `bkg_${seq}`, baseDemand: noDemand,
  });
}

describe('planCreate', () => {
  it('returns the booking and the counts to write', () => {
    const plan = create('u1', {});
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.booking).toMatchObject({ userId: 'u1', restaurantId: 'rest_001', tableType: 'couple', status: 'confirmed' });
    expect(plan.value.nextCounts).toEqual({ '19:30': { couple: 1 } });
    expect(plan.value.occupancyId).toBe('rest_001_2026-10-21');
  });

  it('passes a broken rule straight through and plans no write', () => {
    const plan = create('u1', {}, { guestCount: 0 });
    expect(!plan.ok && plan.error.code).toBe('INVALID_GUEST_COUNT');
  });

  it('shares capacity between different people', () => {
    // Coconut Grove has 4 couple tables, 5 standard and 2 family tables.
    let counts: OccupancyCounts = {};
    const tables: string[] = [];
    for (let person = 1; person <= 5; person++) {
      const plan = create(`user_${person}`, counts);
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      tables.push(plan.value.booking.tableType);
      counts = plan.value.nextCounts;
    }
    // The first four couples get couple tables; the fifth is moved to a standard table.
    expect(tables).toEqual(['couple', 'couple', 'couple', 'couple', 'standard']);
  });

  it('refuses once every suitable table is taken, and stops at exactly that point', () => {
    let counts: OccupancyCounts = {};
    let booked = 0;
    for (let person = 1; person <= 20; person++) {
      const plan = create(`user_${person}`, counts);
      if (!plan.ok) {
        expect(plan.error.code).toBe('NO_TABLE_AVAILABLE');
        break;
      }
      counts = plan.value.nextCounts;
      booked += 1;
    }
    expect(booked).toBe(4 + 5 + 2); // couple + standard + family tables
  });

  it('gives the last family table to only one of two people', () => {
    const counts: OccupancyCounts = { '19:30': { family: 1 } }; // 1 of 2 family tables already taken
    const first = create('alice', counts, { guestCount: 5 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Bob decides on the counts Alice's booking left behind, as a real transaction would.
    const second = create('bob', first.value.nextCounts, { guestCount: 5 });
    expect(!second.ok && second.error.code).toBe('NO_TABLE_AVAILABLE');
  });

  it('still blocks a person from overlapping their own bookings', () => {
    const first = create('u1', {});
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const clash = create('u1', first.value.nextCounts, {}, [first.value.booking]);
    expect(!clash.ok && clash.error.code).toBe('BOOKING_CONFLICT');
  });
});

describe('planCancel', () => {
  const booked = (): { booking: Booking; counts: OccupancyCounts } => {
    const plan = create('u1', {});
    if (!plan.ok) throw new Error('setup failed');
    return { booking: plan.value.booking, counts: plan.value.nextCounts };
  };

  it('cancels the booking and releases its table', () => {
    const { booking, counts } = booked();
    const plan = planCancel({ booking, counts, now: NOW });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.booking.status).toBe('cancelled');
    expect(plan.value.nextCounts).toEqual({});
    expect(plan.value.occupancyId).toBe('rest_001_2026-10-21');
  });

  it('lets someone else take the table that was released', () => {
    let counts: OccupancyCounts = { '19:30': { family: 1 } };
    const alice = create('alice', counts, { guestCount: 5 });
    if (!alice.ok) throw new Error('setup failed');
    counts = alice.value.nextCounts; // both family tables now taken
    expect(create('bob', counts, { guestCount: 5 }).ok).toBe(false);

    const cancel = planCancel({ booking: alice.value.booking, counts, now: NOW });
    if (!cancel.ok) throw new Error('setup failed');
    expect(create('bob', cancel.value.nextCounts, { guestCount: 5 }).ok).toBe(true);
  });

  it('passes rule failures through', () => {
    const { booking, counts } = booked();
    const already = planCancel({ booking: { ...booking, status: 'cancelled' }, counts, now: NOW });
    expect(!already.ok && already.error.code).toBe('ALREADY_CANCELLED');

    const noCancel = planCancel({ booking: { ...booking, cancellationAllowed: false }, counts, now: NOW });
    expect(!noCancel.ok && noCancel.error.code).toBe('CANCELLATION_NOT_ALLOWED');

    const started = planCancel({ booking, counts, now: new Date(2026, 9, 21, 20, 0) });
    expect(!started.ok && started.error.code).toBe('BOOKING_STARTED');
  });

  it('never drives a count below zero', () => {
    const { booking } = booked();
    const plan = planCancel({ booking, counts: {}, now: NOW });
    expect(plan.ok && plan.value.nextCounts).toEqual({});
  });
});
