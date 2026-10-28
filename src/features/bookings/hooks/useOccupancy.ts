import { useEffect, useState } from 'react';
import { bookingRepository } from '../data/bookingRepository';
import type { OccupancyCounts } from '../domain/occupancy';

/**
 * Live table counts for one restaurant and date, or null until they arrive. If they can't
 * be loaded (e.g. offline) this settles on an empty set, so the form still works; the
 * server re-checks everything when the booking is confirmed.
 */
export function useOccupancy(restaurantId: string, date: string): OccupancyCounts | null {
  const key = `${restaurantId}|${date}`;
  const [state, setState] = useState<{ key: string; counts: OccupancyCounts } | null>(null);

  useEffect(
    () =>
      bookingRepository.subscribeToOccupancy(restaurantId, date, {
        onData: (counts) => setState({ key, counts }),
        onError: () => setState({ key, counts: {} }),
      }),
    [restaurantId, date, key],
  );

  // Ignore counts that belong to the previously selected date.
  return state?.key === key ? state.counts : null;
}
