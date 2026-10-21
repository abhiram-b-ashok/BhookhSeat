
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/ui/EmptyState';
import ScreenContainer from '@/components/ui/ScreenContainer';
import AppButton from '@/components/ui/AppButton';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '@/components/ui/AppTextInput';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import { spacing, typography } from '@/constants/theme';
import CuisineChip from '@/features/restaurants/components/CuisineChip';
import RestaurantCard from '@/features/restaurants/components/RestaurantCard';
import { filterRestaurants, getAllCuisines } from '@/features/restaurants/domain/restaurantFilters';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';

export default function ExploreScreen() {

  const { restaurants, loading, error, reload } = useRestaurants();
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);

  const cuisines = useMemo(() => getAllCuisines(restaurants), [restaurants]);
  const results = useMemo(
    () => filterRestaurants(restaurants, { query, cuisine }),
    [restaurants, query, cuisine],
  );

  const hasFilters = query.trim() !== '' || cuisine !== null;
  const clearFilters = () => {
    setQuery('');
    setCuisine(null);
  };


   return (
    <ScreenContainer>
      <AppHeader title="Explore" subtitle="Search and filter by cuisine" />

      <AppTextInput
        leftIcon="search"
        placeholder="Search name, cuisine or area"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Search restaurants"
      />

      {loading ? (
        <LoadingState message="Finding restaurants…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <CuisineChip label="All" selected={cuisine === null} onPress={() => setCuisine(null)} />
            {cuisines.map((c) => (
              <CuisineChip
                key={c}
                label={c}
                selected={cuisine === c}
                onPress={() => setCuisine(cuisine === c ? null : c)}
              />
            ))}
          </ScrollView>

          <Text style={styles.count}>
            {results.length} {results.length === 1 ? 'restaurant' : 'restaurants'}
          </Text>

          {results.length === 0 ? (
            <>
              <EmptyState
                icon="search-outline"
                title="No restaurants found"
                message="Try a different name or cuisine."
              />
              {hasFilters ? (
                <AppButton title="Clear filters" variant="secondary" onPress={clearFilters} />
              ) : null}
            </>
          ) : (
            <View style={styles.list}>
              {results.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -spacing.xl, marginTop: spacing.lg },
  chipRow: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  count: { ...typography.caption, marginTop: spacing.lg, marginBottom: spacing.md },
  list: { gap: spacing.lg },
});
