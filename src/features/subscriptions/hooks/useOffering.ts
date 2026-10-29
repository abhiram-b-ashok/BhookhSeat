import { useCallback, useEffect, useState } from 'react';
import { reportError } from '@/services/firebase/crashlytics';
import { loadPlanOptions } from '@/services/purchases/revenueCat';
import type { PlanOption } from '../domain/plans';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; options: PlanOption[] };

/** What can be bought right now. "ready" with an empty list means nothing is set up in RevenueCat yet. */
export function useOffering(enabled: boolean) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ status: 'loading' });

    loadPlanOptions()
      .then((options) => {
        if (!cancelled) setState({ status: 'ready', options });
      })
      .catch((error) => {
        reportError(error, 'revenuecat-offerings');
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
