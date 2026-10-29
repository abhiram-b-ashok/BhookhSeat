import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { bookingRepository } from '@/features/bookings/data/bookingRepository';
import { reportError } from '@/services/firebase/crashlytics';
import {
  clearUser,
  identifyUser,
  purchaseOption,
  restorePurchases,
  setUpPurchases,
  subscribeToEntitlement,
} from '@/services/purchases/revenueCat';
import { planFor, planStateFor, type SubscriptionState } from '../domain/entitlements';
import type { PlanId } from '../domain/plans';
import { purchaseErrorMessage } from '../domain/purchaseErrors';

/** `message: null` means the person cancelled, which is not worth showing as an error. */
export type PurchaseOutcome = { ok: true } | { ok: false; message: string | null };
export type RestoreOutcome = { ok: true; isPremium: boolean } | { ok: false; message: string };

type Value = {
  state: SubscriptionState;
  plan: PlanId;
  /** 'test' = RevenueCat Test Store (no real money). null = purchases not set up. */
  mode: 'test' | 'live' | null;
  purchase: (optionId: string) => Promise<PurchaseOutcome>;
  restore: () => Promise<RestoreOutcome>;
  retry: () => void;
};

const LOADING: SubscriptionState = { status: 'loading' };
const SubscriptionContext = createContext<Value | null>(null);

type Entry = { uid: string; value: SubscriptionState };

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [mode, setMode] = useState<'test' | 'live' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  // Only ever show the state that belongs to the CURRENT account.
  const state = uid && entry?.uid === uid ? entry.value : LOADING;
  const plan = planFor(state);

  useEffect(() => {
    if (!uid) {
      void clearUser();
      return;
    }

    let cancelled = false;
    let unsubscribe = () => {};
    const publish = (value: SubscriptionState) => {
      if (!cancelled) setEntry({ uid, value });
    };

    const choice = setUpPurchases();
    if (!choice.ok) {
      publish({ status: 'unavailable', reason: choice.reason });
      return;
    }
    setMode(choice.mode);

    (async () => {
      try {
        const isPremium = await identifyUser(uid);
        if (cancelled) return;
        publish({ status: 'ready', isPremium });
        unsubscribe = subscribeToEntitlement((premium) => publish({ status: 'ready', isPremium: premium }));
      } catch (error) {
        reportError(error, 'subscription-load');
        publish({ status: 'unavailable', reason: 'Could not reach the subscription service.' });
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, attempt]);

  // Tell the booking store which plan this account is on. Until RevenueCat answers it
  // stays "unknown", which is treated as Free.
  const planState = planStateFor(state);
  useEffect(() => {
    if (uid) bookingRepository.setPlan(uid, planState);
  }, [uid, planState]);

  // If the service was unreachable, try again when the app comes back to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state.status === 'unavailable' && mode !== null) {
        setAttempt((n) => n + 1);
      }
    });
    return () => subscription.remove();
  }, [state.status, mode]);

  const purchase = useCallback(async (optionId: string): Promise<PurchaseOutcome> => {
    const result = await purchaseOption(optionId);
    if (!result.ok) return { ok: false, message: purchaseErrorMessage(result.kind) };

    const current = uidRef.current;
    if (current) setEntry({ uid: current, value: { status: 'ready', isPremium: result.isPremium } });

    if (!result.isPremium) {
      return {
        ok: false,
        message:
          'The purchase went through, but Premium did not turn on. Check that the product is attached to the "premium" entitlement in RevenueCat.',
      };
    }
    return { ok: true };
  }, []);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    const result = await restorePurchases();
    if (!result.ok) {
      return { ok: false, message: purchaseErrorMessage(result.kind) ?? 'Could not restore purchases.' };
    }
    const current = uidRef.current;
    if (current) setEntry({ uid: current, value: { status: 'ready', isPremium: result.isPremium } });
    return { ok: true, isPremium: result.isPremium };
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(
    () => ({ state, plan, mode, purchase, restore, retry }),
    [state, plan, mode, purchase, restore, retry],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): Value {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used inside <SubscriptionProvider>.');
  return context;
}
