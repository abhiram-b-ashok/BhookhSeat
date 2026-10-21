import { restaurantsSeed } from '../features/restaurants/data/restaurants.seed';
import { filterRestaurants, getAllCuisines } from '../features/restaurants/domain/restaurantFilters';

const names = (list: typeof restaurantsSeed) => list.map((r) => r.name);

describe('restaurant filters', () => {
  it('returns everything when no filters are set', () => {
    expect(filterRestaurants(restaurantsSeed)).toHaveLength(8);
    expect(filterRestaurants(restaurantsSeed, { query: '   ', cuisine: null })).toHaveLength(8);
  });

  it('lists each cuisine once, sorted', () => {
    const cuisines = getAllCuisines(restaurantsSeed);
    expect(cuisines).toHaveLength(17);
    expect(cuisines).toEqual([...cuisines].sort((a, b) => a.localeCompare(b)));
  });

  it('searches by name, area and cuisine, ignoring case and extra spaces', () => {
    expect(names(filterRestaurants(restaurantsSeed, { query: 'KERALA' }))).toEqual(['Coconut Grove']);
    expect(names(filterRestaurants(restaurantsSeed, { query: '  pattom ' }))).toEqual(['Saffron Sky']);
  });

  it('requires every typed word to match', () => {
    expect(names(filterRestaurants(restaurantsSeed, { query: 'kerala seafood' }))).toEqual(['Coconut Grove']);
    expect(filterRestaurants(restaurantsSeed, { query: 'kerala pizza' })).toHaveLength(0);
  });

  it('filters by cuisine and combines with search', () => {
    expect(names(filterRestaurants(restaurantsSeed, { cuisine: 'Cafe' }))).toEqual([
      'Olive & Thyme',
      'Berry & Batter',
    ]);
    expect(names(filterRestaurants(restaurantsSeed, { cuisine: 'Cafe', query: 'berry' }))).toEqual(['Berry & Batter']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterRestaurants(restaurantsSeed, { query: 'sushi' })).toEqual([]);
  });
});
