import { useCallback, useSyncExternalStore } from 'react';
import { useOptionalAuth } from '@/features/auth/hooks/useAuth';
import type { Restaurant } from '@/features/restaurants/domain/restaurant.types';
import { bookingRepository } from '../data/bookingRepository';
import type { Booking, BookingInput, Result } from '../domain/booking.types';
import { buildBooking, cancelBooking as applyCancellation } from '../domain/bookingRules';

const createBookingId = () =>
  `bkg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function useBookings() {
  const auth = useOptionalAuth();
  const userId = auth?.user?.uid;
  const bookings = useSyncExternalStore(bookingRepository.subscribe, bookingRepository.getAll);

  /**
   * Validate and save in one synchronous step, so two quick taps can never both
   * pass validation before the first booking is stored.
   */
  const createBooking = useCallback(
    (restaurants: Restaurant[], input: BookingInput): Result<Booking> => {
      const result = buildBooking({
        restaurants,
        input,
        existingBookings: bookingRepository.getAll(),
        now: new Date(),
        id: createBookingId(),
        userId,
      });
      if (result.ok) bookingRepository.add(result.value);
      return result;
    },
    [userId],
  );

  const cancelBooking = useCallback((bookingId: string): Result<Booking> => {
    const result = applyCancellation(bookingRepository.getAll(), bookingId, new Date());
    if (result.ok) bookingRepository.update(result.value);
    return result;
  }, []);

  const clearBookings = useCallback(() => bookingRepository.clear(), []);

  return { bookings, createBooking, cancelBooking, clearBookings };
}
