
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { colors, spacing } from '@/constants/theme';
import RestaurantDetails from '@/features/restaurants/components/RestaurantDetails';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant, loading, error, reload } = useRestaurant(id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

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
    body = <RestaurantDetails restaurant={restaurant} />;
  }

  return (
    <ScreenContainer>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.back}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, alignSelf: 'flex-start' },
  backText: { color: colors.primary, fontSize: 16 },
});