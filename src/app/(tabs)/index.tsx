
import AppHeader from '@/components/AppHeader';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { formatLongDate } from '@/utils/formatDate';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import RestaurantCard from '@/features/restaurants/components/RestaurantCard';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';

export default function HomeScreen() {
const { restaurants, loading, error, reload } = useRestaurants();

  const featured = useMemo(() => restaurants.filter((r) => r.isFeatured), [restaurants]);
  const others = useMemo(() => restaurants.filter((r) => !r.isFeatured), [restaurants]);

  const openRestaurant = (id: string) =>
    router.push({ pathname: '/restaurant/[id]', params: { id } });

    return (
    <ScreenContainer>
      <AppHeader title="BhookhSeat" subtitle={formatLongDate()} />

      {loading ? (
        <LoadingState message="Finding restaurants…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <SectionHeader title="Featured" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
          >
            {featured.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                style={styles.featuredCard}
                onPress={() => openRestaurant(r.id)}
              />
            ))}
          </ScrollView>

          <SectionHeader title="More restaurants" />
          <View style={styles.list}>
            {others.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} onPress={() => openRestaurant(r.id)} />
            ))}
          </View>

          <Text style={styles.note}>
            All restaurants are fictional sample data. Bookings are simulated.
          </Text>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Break out of the screen padding so cards can scroll edge to edge.
  carousel: { marginHorizontal: -spacing.xl },
  carouselContent: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  featuredCard: { width: 280 },
  list: { gap: spacing.lg },
  note: { ...typography.caption, textAlign: 'center', marginTop: spacing.xxl },
});