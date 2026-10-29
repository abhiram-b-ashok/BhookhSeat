import { collection, doc, getFirestore, onSnapshot, runTransaction } from '@react-native-firebase/firestore';
import type { BookingBackend } from '@/features/bookings/data/bookingBackend';
import { isBooking } from '@/features/bookings/data/bookingStorage';
import type { Booking, Result } from '@/features/bookings/domain/booking.types';
import { OCCUPANCY_DOCUMENT_KEYS, toBookingDocument } from '@/features/bookings/domain/bookingDocument';
import { planCancel, planCreate } from '@/features/bookings/domain/bookingPlans';
import { bookingFailure } from '@/features/bookings/domain/bookingRules';
import { occupancyDocId, parseOccupancyCounts } from '@/features/bookings/domain/occupancy';
import { isValidISODate } from '@/utils/dateTime';

/**
 * The only file that talks to Firestore. Layout:
 *   users/{uid}/bookings/{bookingId}   one document per booking, readable only by its owner
 *   occupancy/{restaurantId}_{date}    shared table counts, changed only inside a transaction
 * Keep firestore.rules in step with this file (a test checks the field names match).
 */

const bookingsPath = (userId: string) => `users/${userId}/bookings`;

export const firestoreBookingBackend: BookingBackend = {
  subscribeToBookings(userId, { onData, onError }) {
    return onSnapshot(
      collection(getFirestore(), bookingsPath(userId)),
      (snapshot) => {
        const list: Booking[] = [];
        snapshot.forEach((document) => {
          const data = document.data();
          // Ignore anything malformed instead of crashing the whole list.
          if (isBooking(data)) list.push(data);
        });
        onData(list);
      },
      onError,
    );
  },

  subscribeToOccupancy(restaurantId, date, { onData, onError }) {
    return onSnapshot(
      doc(getFirestore(), 'occupancy', occupancyDocId(restaurantId, date)),
      (snapshot) => onData(snapshot.exists() ? parseOccupancyCounts(snapshot.data()?.counts) : {}),
      onError,
    );
  },

  async createBooking({ userId, restaurants, input, ownBookings, now, id, plan }): Promise<Result<Booking>> {
    // Checked first so a bad id can never become part of a document path.
    if (!restaurants.some((r) => r.id === input.restaurantId)) return bookingFailure('RESTAURANT_NOT_FOUND');
    if (!isValidISODate(input.date)) return bookingFailure('INVALID_DATE');

    const db = getFirestore();
    const occupancyRef = doc(db, 'occupancy', occupancyDocId(input.restaurantId, input.date));
    const bookingRef = doc(db, bookingsPath(userId), id);

    // Firestore re-runs this function if another booking changes the counts mid-way,
    // so the decision is always made on the latest numbers.
    return runTransaction(db, async (transaction): Promise<Result<Booking>> => {
      const occupancySnap = await transaction.get(occupancyRef);
      const counts = occupancySnap.exists() ? parseOccupancyCounts(occupancySnap.data()?.counts) : {};

      const planned = planCreate({ userId, restaurants, input, ownBookings, counts, now, id, plan });
      if (!planned.ok) return planned;

      transaction.set(bookingRef, toBookingDocument(planned.value.booking, userId));
      transaction.set(occupancyRef, {
        [OCCUPANCY_DOCUMENT_KEYS[0]]: planned.value.booking.restaurantId,
        [OCCUPANCY_DOCUMENT_KEYS[1]]: planned.value.booking.date,
        [OCCUPANCY_DOCUMENT_KEYS[2]]: planned.value.nextCounts,
      });
      return { ok: true, value: planned.value.booking };
    });
  },

  async cancelBooking({ userId, bookingId, ownBookings, now }): Promise<Result<Booking>> {
    const local = ownBookings.find((b) => b.id === bookingId);
    if (!local) return bookingFailure('BOOKING_NOT_FOUND');

    const db = getFirestore();
    const bookingRef = doc(db, bookingsPath(userId), bookingId);
    const occupancyRef = doc(db, 'occupancy', occupancyDocId(local.restaurantId, local.date));

    return runTransaction(db, async (transaction): Promise<Result<Booking>> => {
      const bookingSnap = await transaction.get(bookingRef);
      const occupancySnap = await transaction.get(occupancyRef);

      // Decide on the copy stored on the server, not the possibly stale one on screen.
      const stored = bookingSnap.exists() ? bookingSnap.data() : null;
      if (!isBooking(stored)) return bookingFailure('BOOKING_NOT_FOUND');

      const counts = occupancySnap.exists() ? parseOccupancyCounts(occupancySnap.data()?.counts) : {};
      const plan = planCancel({ booking: stored, counts, now });
      if (!plan.ok) return plan;

      transaction.update(bookingRef, { status: 'cancelled' });
      transaction.set(occupancyRef, {
        restaurantId: stored.restaurantId,
        date: stored.date,
        counts: plan.value.nextCounts,
      });
      return { ok: true, value: plan.value.booking };
    });
  },
};
