import { router, useLocalSearchParams } from 'expo-router';
import AppButton from '@/components/ui/AppButton';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import BookingConfirmation from '@/features/bookings/components/BookingConfirmation';
import { useBookings } from '@/features/bookings/hooks/useBookings';

export default function ConfirmationScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { bookings } = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="alert-circle-outline"
          title="Booking not found"
          message="It may have been cleared. Check My Bookings."
        />
        <AppButton title="Back to home" onPress={() => router.dismissTo('/')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <BookingConfirmation
        booking={booking}
        onViewBookings={() => router.dismissTo('/bookings')}
        onGoHome={() => router.dismissTo('/')}
      />
    </ScreenContainer>
  );
}
