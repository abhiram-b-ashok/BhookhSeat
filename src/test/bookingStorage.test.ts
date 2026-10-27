import {
  BOOKINGS_STORAGE_KEY,
  getBookingsStorageKey,
  isBooking,
  parseStoredBookings,
  serializeBookings,
} from '../features/bookings/data/bookingStorage';
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

const envelope = (bookings: unknown, version: unknown = 1) => JSON.stringify({ version, bookings });

describe('serialising and parsing bookings', () => {
  it('round-trips bookings unchanged', () => {
    const bookings = [makeBooking(), makeBooking({ id: 'bkg_2', status: 'cancelled' })];
    expect(parseStoredBookings(serializeBookings(bookings))).toEqual(bookings);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(parseStoredBookings(null)).toEqual([]);
    expect(parseStoredBookings('')).toEqual([]);
  });

  it('survives corrupt JSON without throwing', () => {
    expect(parseStoredBookings('{not json')).toEqual([]);
    expect(parseStoredBookings('undefined')).toEqual([]);
  });

  it('ignores data saved in an unknown format or version', () => {
    expect(parseStoredBookings(envelope([makeBooking()], 2))).toEqual([]);
    expect(parseStoredBookings(JSON.stringify({ bookings: [makeBooking()] }))).toEqual([]); // no version field
    expect(parseStoredBookings(JSON.stringify([makeBooking()]))).toEqual([]); // bare array
    expect(parseStoredBookings(envelope('nope'))).toEqual([]);
    expect(parseStoredBookings('null')).toEqual([]);
    expect(parseStoredBookings('42')).toEqual([]);
  });

  it('drops invalid entries but keeps the valid ones', () => {
    const good = makeBooking({ id: 'good' });
    const raw = envelope([
      good,
      null,
      'a string',
      { ...makeBooking({ id: 'bad_date' }), date: '2026-02-31' },
      { ...makeBooking({ id: 'bad_time' }), time: '25:99' },
      { ...makeBooking({ id: 'bad_status' }), status: 'pending' },
      { ...makeBooking({ id: 'bad_table' }), tableType: 'sofa' },
      { ...makeBooking({ id: 'zero_guests' }), guestCount: 0 },
      { ...makeBooking({ id: 'frac_guests' }), guestCount: 2.5 },
      { ...makeBooking({ id: 'bad_duration' }), durationMinutes: -5 },
      { ...makeBooking({ id: 'no_name' }), restaurantName: undefined },
      { ...makeBooking({ id: '' }) },
    ]);
    expect(parseStoredBookings(raw)).toEqual([good]);
  });

  it('keeps only the first booking when ids are duplicated', () => {
    const first = makeBooking({ id: 'same', guestCount: 2 });
    const second = makeBooking({ id: 'same', guestCount: 4 });
    expect(parseStoredBookings(envelope([first, second]))).toEqual([first]);
  });

  it('isBooking rejects non-objects and arrays', () => {
    expect(isBooking(undefined)).toBe(false);
    expect(isBooking([makeBooking()])).toBe(false);
    expect(isBooking(makeBooking())).toBe(true);
    expect(isBooking(makeBooking({ userId: 'usr_abc' }))).toBe(true);
    expect(isBooking({ ...makeBooking(), userId: 123 })).toBe(false);
  });

  it('computes storage keys scoped by user', () => {
    expect(getBookingsStorageKey()).toBe(BOOKINGS_STORAGE_KEY);
    expect(getBookingsStorageKey(null)).toBe(BOOKINGS_STORAGE_KEY);
    expect(getBookingsStorageKey('usr_123')).toBe('bhookhseat.bookings.usr_123');
  });
});
