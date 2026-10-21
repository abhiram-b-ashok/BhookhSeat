
import type { Restaurant } from './restaurant.types';

export type RestaurantFilters = {
  query?: string;
  cuisine?: string | null;
};

/** Unique cuisines across all restaurants, sorted alphabetically. */
export function getAllCuisines(restaurants: Restaurant[]): string[] {
  const set = new Set<string>();
  restaurants.forEach((r) => r.cuisine.forEach((c) => set.add(c)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function matchesQuery(restaurant: Restaurant, query: string): boolean {
  const haystack = [
    restaurant.name,
    restaurant.tagline,
    restaurant.address.area,
    ...restaurant.cuisine,
  ]
    .join(' ')
    .toLowerCase();

  // Every word typed must appear somewhere ("kerala seafood" matches Coconut Grove).
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function filterRestaurants(
  restaurants: Restaurant[],
  { query = '', cuisine = null }: RestaurantFilters = {},
): Restaurant[] {
  const trimmed = query.trim();

  return restaurants.filter((r) => {
    if (cuisine && !r.cuisine.includes(cuisine)) return false;
    if (trimmed && !matchesQuery(r, trimmed)) return false;
    return true;
  });
}