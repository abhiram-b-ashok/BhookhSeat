import type { Restaurant } from '../../restaurants/domain/restaurant.types';
import type { Booking, BookingInput, Result } from '../domain/booking.types';
import type { OccupancyCounts } from '../domain/occupancy';
import type { PlanId } from '../../subscriptions/domain/plans';

type Handlers<T> = { onData: (data: T) => void; onError: (error: unknown) => void };

/**
 * Everything the app needs from a server. Firestore implements it for real; tests
 * implement it with a fake, so the store's logic can be tested without a network.
 */
export type BookingBackend = {
  /** Live list of one user's bookings. Returns an unsubscribe function. */
  subscribeToBookings(userId: string, handlers: Handlers<Booking[]>): () => void;

  /** Live table counts for one restaurant on one date. */
  subscribeToOccupancy(
    restaurantId: string,
    date: string,
    handlers: Handlers<OccupancyCounts>,
  ): () => void;

  /** Must check the rules and take the table in one atomic step. */
  createBooking(args: {
    userId: string;
    restaurants: Restaurant[];
    input: BookingInput;
    ownBookings: Booking[];
    now: Date;
    id: string;
    plan: PlanId;
  }): Promise<Result<Booking>>;

  /** Must cancel the booking and release its table in one atomic step. */
  cancelBooking(args: {
    userId: string;
    bookingId: string;
    ownBookings: Booking[];
    now: Date;
  }): Promise<Result<Booking>>;
};
