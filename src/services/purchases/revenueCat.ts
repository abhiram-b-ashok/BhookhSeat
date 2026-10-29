import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { isPremiumFromCustomerInfo } from '@/features/subscriptions/domain/entitlements';
import type { PlanOption } from '@/features/subscriptions/domain/plans';
import { purchaseErrorKind, type PurchaseErrorKind } from '@/features/subscriptions/domain/purchaseErrors';
import { resolveRevenueCatKey, type KeyChoice } from '@/features/subscriptions/domain/revenueCatKey';
import { reportError } from '@/services/firebase/crashlytics';

/**
 * The only file that talks to RevenueCat. The rest of the app sees plain values
 * (isPremium, PlanOption), never SDK objects.
 */

let choice: KeyChoice | null = null;

/** Starts the SDK once. Safe to call repeatedly. The key choice refuses Test Store keys in release builds. */
export function setUpPurchases(): KeyChoice {
  if (choice) return choice;

  const picked = resolveRevenueCatKey({
    isDev: __DEV__,
    platform: Platform.OS,
    // These must be written out in full so Expo can inline them at build time.
    testKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY,
    androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });

  if (!picked.ok) {
    choice = picked;
    return choice;
  }

  try {
    Purchases.configure({ apiKey: picked.key });
    choice = picked;
  } catch (error) {
    reportError(error, 'revenuecat-configure');
    choice = { ok: false, reason: 'Could not start the subscription service.' };
  }
  return choice;
}

const isReady = () => choice?.ok === true;

/** Ties purchases to this account. Resolves to whether they currently have Premium. */
export async function identifyUser(userId: string): Promise<boolean> {
  const { customerInfo } = await Purchases.logIn(userId);
  return isPremiumFromCustomerInfo(customerInfo);
}

export async function clearUser(): Promise<void> {
  if (!isReady()) return;
  try {
    await Purchases.logOut();
  } catch {
    // Throws if nobody was logged in, which is fine.
  }
}

/** Calls back whenever the entitlement changes (purchase, renewal, expiry, restore). */
export function subscribeToEntitlement(listener: (isPremium: boolean) => void): () => void {
  const handler = (info: CustomerInfo) => listener(isPremiumFromCustomerInfo(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(handler);
  };
}

/* The SDK packages stay here, looked up by id, so screens never hold SDK objects. */
const packages = new Map<string, PurchasesPackage>();

export async function loadPlanOptions(): Promise<PlanOption[]> {
  const offerings = await Purchases.getOfferings();
  packages.clear();
  return (offerings.current?.availablePackages ?? []).map((pkg) => {
    packages.set(pkg.identifier, pkg);
    return { id: pkg.identifier, title: pkg.product.title, priceString: pkg.product.priceString };
  });
}

export type PurchaseResult =
  | { ok: true; isPremium: boolean }
  | { ok: false; kind: PurchaseErrorKind };

export async function purchaseOption(optionId: string): Promise<PurchaseResult> {
  const pkg = packages.get(optionId);
  if (!pkg) return { ok: false, kind: 'unavailable' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, isPremium: isPremiumFromCustomerInfo(customerInfo) };
  } catch (error) {
    const kind = purchaseErrorKind(error);
    if (kind === 'other') reportError(error, 'revenuecat-purchase'); // unexpected only
    return { ok: false, kind };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { ok: true, isPremium: isPremiumFromCustomerInfo(customerInfo) };
  } catch (error) {
    const kind = purchaseErrorKind(error);
    if (kind === 'other') reportError(error, 'revenuecat-restore');
    return { ok: false, kind };
  }
}
