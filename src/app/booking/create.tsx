import { router, useLocalSearchParams } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import BackButton from '@/components/ui/BackButton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import BookingForm from '@/features/bookings/components/BookingForm';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';

export default function CreateBookingScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { restaurant, loading, error, reload } = useRestaurant(restaurantId);

  let body;
  if (loading) {
    body = <LoadingState />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={reload} />;
  } else if (!restaurant) {
    body = (
      <EmptyState
        icon="alert-circle-outline"
        title="Restaurant not found"
        message="Go back and pick a restaurant to book."
      />
    );
  } else {
    body = (
      <BookingForm
        restaurant={restaurant}
        onBooked={(booking) =>
          // replace, so Back from the confirmation does not return to a finished form
          router.replace({ pathname: '/booking/confirmation', params: { bookingId: booking.id } })
        }
      />
    );
  }

  return (
    <ScreenContainer>
      <BackButton />
      <AppHeader title="Book a table" subtitle={restaurant?.name} />
      {body}
    </ScreenContainer>
  );
}
