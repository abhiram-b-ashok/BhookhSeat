
import type { Restaurant } from '../domain/restaurant.types';
import { restaurantsSeed } from './restaurants.seed';

/**
 * The only place screens get restaurants from. It is async on purpose, so
 * swapping the seed data for Firestore later will not change any screen code.
 */
export const restaurantRepository = {
  async getAll(): Promise<Restaurant[]> {
    return restaurantsSeed;
  },

  async getById(id: string): Promise<Restaurant | null> {
    return restaurantsSeed.find((r) => r.id === id) ?? null;
  },
};