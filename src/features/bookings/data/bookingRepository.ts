import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBookingRepository } from './createBookingRepository';

/** The app's single booking store, saved on the device with AsyncStorage. */
export const bookingRepository = createBookingRepository(AsyncStorage, {
  onError: (error) => {
    if (__DEV__) console.warn('[bookings] storage problem:', error);
  },
});
