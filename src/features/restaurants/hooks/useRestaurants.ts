
import { useCallback, useEffect, useState } from 'react';
import { restaurantRepository } from '../data/restaurantRepository';
import type { Restaurant } from '../domain/restaurant.types';

const NONE: Restaurant[] = [];

function useAsyncData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('Something went wrong while loading.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, reload };
}

export function useRestaurants() {
  const { data, ...rest } = useAsyncData(restaurantRepository.getAll);
  return { restaurants: data ?? NONE, ...rest };
}

export function useRestaurant(id: string | undefined) {
  const load = useCallback(
    () => (id ? restaurantRepository.getById(id) : Promise.resolve(null)),
    [id],
  );
  const { data, ...rest } = useAsyncData(load);
  return { restaurant: data, ...rest };
}