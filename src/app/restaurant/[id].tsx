import { router, useLocalSearchParams } from 'expo-router';
import BackButton from '@/components/ui/BackButton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import RestaurantDetails from '@/features/restaurants/components/RestaurantDetails';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant, loading, error, reload } = useRestaurant(id);

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
        message="It may have been removed from the sample data."
      />
    );
  } else {
    body = (
      <RestaurantDetails
        restaurant={restaurant}
        onBookPress={() =>
          router.push({ pathname: '/booking/create', params: { restaurantId: restaurant.id } })
        }
      />
    );
  }

  return (
    <ScreenContainer>
      <BackButton />
      {body}
    </ScreenContainer>
  );
}
