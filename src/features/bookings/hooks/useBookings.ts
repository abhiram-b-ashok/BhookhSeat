import { useCallback, useSyncExternalStore } from 'react';
import type { Restaurant } from '@/features/restaurants/domain/restaurant.types';
import { bookingRepository } from '../data/bookingRepository';
import type { Booking, BookingInput, Result } from '../domain/booking.types';

export function useBookings() {
  const bookings = useSyncExternalStore(bookingRepository.subscribe, bookingRepository.getAll);
  const status = useSyncExternalStore(bookingRepository.subscribe, bookingRepository.getStatus);

  /**
   * Asynchronous: the booking is checked and saved on the server in one step, so the
   * last table can only ever go to one person.
   */
  const createBooking = useCallback(
    (restaurants: Restaurant[], input: BookingInput): Promise<Result<Booking>> =>
      bookingRepository.create(restaurants, input),
    [],
  );

  const cancelBooking = useCallback(
    (bookingId: string): Promise<Result<Booking>> => bookingRepository.cancel(bookingId),
    [],
  );

  const reload = useCallback(() => bookingRepository.reload(), []);

  return { bookings, status, createBooking, cancelBooking, reload };
}
