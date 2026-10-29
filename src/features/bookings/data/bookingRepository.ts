import { reportError } from '@/services/firebase/crashlytics';
import { firestoreBookingBackend } from '@/services/firebase/firestore';
import { createBookingStore } from './createBookingStore';

/** The app's single booking store, kept live from Firestore for the signed-in user. */
export const bookingRepository = createBookingStore(firestoreBookingBackend, {
  onError: (error) => reportError(error, 'bookings-backend'),
});
