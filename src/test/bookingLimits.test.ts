import { restaurantsSeed } from '../features/restaurants/data/restaurants.seed';
import type { Booking, BookingInput } from '../features/bookings/domain/booking.types';
import { buildBooking } from '../features/bookings/domain/bookingRules';
import type { PlanId } from '../features/subscriptions/domain/plans';
import { noDemand } from '../features/bookings/domain/simulatedDemand';

const NOW = new Date(2026, 9, 20, 10, 0); // Tue 20 Oct 2026, 10:00

/** Active bookings on separate days, so none of them clash with each other or with the new one. */
const active = (n: number): Booking[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `b${i}`, userId: 'u1', restaurantId: 'rest_001', restaurantName: 'Coconut Grove', durationMinutes: 90,
    cancellationAllowed: true, date: `2026-11-${String(i + 1).padStart(2, '0')}`, time: '19:30', guestCount: 2,
    tableType: 'couple', tableLabel: 'Couple table', status: 'confirmed', createdAt: '2026-10-20T04:30:00.000Z',
  }));

const input: BookingInput = { restaurantId: 'rest_001', date: '2026-10-21', time: '19:30', guestCount: 2 };

function book(existing: Booking[], plan?: PlanId) {
  return buildBooking({ restaurants: restaurantsSeed, input, existingBookings: existing, now: NOW, id: 'new', demand: noDemand, plan });
}
const code = (r: ReturnType<typeof book>) => (r.ok ? null : r.error.code);

describe('booking limits by plan', () => {
  it('Free allows up to 2 active bookings and blocks the 3rd', () => {
    expect(book(active(0), 'free').ok).toBe(true);
    expect(book(active(1), 'free').ok).toBe(true);
    expect(code(book(active(2), 'free'))).toBe('BOOKING_LIMIT_REACHED');
    expect(code(book(active(5), 'free'))).toBe('BOOKING_LIMIT_REACHED');
  });

  it('Premium allows up to 10 active bookings and blocks the 11th', () => {
    expect(book(active(2), 'premium').ok).toBe(true);
    expect(book(active(9), 'premium').ok).toBe(true);
    expect(code(book(active(10), 'premium'))).toBe('BOOKING_LIMIT_REACHED');
  });

  it('defaults to Free when no plan is passed, so forgetting it never grants extra bookings', () => {
    expect(code(book(active(2)))).toBe('BOOKING_LIMIT_REACHED');
    expect(book(active(1)).ok).toBe(true);
  });

  it('does not count cancelled bookings', () => {
    const [a, b] = active(2);
    expect(book([a, { ...b, status: 'cancelled' }], 'free').ok).toBe(true);
  });

  it('does not count bookings that have already finished', () => {
    const [a, b] = active(2);
    const finished = { ...b, date: '2026-10-19' }; // yesterday
    expect(book([a, finished], 'free').ok).toBe(true);
  });

  it('frees a place again after a cancellation', () => {
    const two = active(2);
    expect(code(book(two, 'free'))).toBe('BOOKING_LIMIT_REACHED');
    expect(book([two[0], { ...two[1], status: 'cancelled' }], 'free').ok).toBe(true);
  });

  it('reports a real problem with the request before the limit', () => {
    const bad = buildBooking({
      restaurants: restaurantsSeed, input: { ...input, guestCount: 0 }, existingBookings: active(2),
      now: NOW, id: 'x', demand: noDemand, plan: 'free',
    });
    expect(code(bad)).toBe('INVALID_GUEST_COUNT');
  });
});
