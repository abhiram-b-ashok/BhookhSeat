export type PurchaseErrorKind = 'cancelled' | 'network' | 'already_owned' | 'unavailable' | 'other';

const MESSAGES: Record<Exclude<PurchaseErrorKind, 'cancelled'>, string> = {
  network: 'No connection. Check your internet and try again.',
  already_owned: 'You already own this. Try "Restore purchases".',
  unavailable: 'Purchases are not available right now. Please try again later.',
  other: 'The purchase could not be completed. You have not been charged.',
};

/** A cancelled purchase is a choice, not an error, so it has no message. */
export function purchaseErrorMessage(kind: PurchaseErrorKind): string | null {
  return kind === 'cancelled' ? null : MESSAGES[kind];
}

/**
 * RevenueCat's error codes, copied here so the mapping can be tested without loading the
 * native SDK. A test compares these with the installed SDK, so they cannot silently drift.
 */
export const PURCHASE_ERROR_CODES = {
  PURCHASE_CANCELLED_ERROR: '1',
  STORE_PROBLEM_ERROR: '2',
  PURCHASE_NOT_ALLOWED_ERROR: '3',
  PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: '5',
  PRODUCT_ALREADY_PURCHASED_ERROR: '6',
  NETWORK_ERROR: '10',
  CONFIGURATION_ERROR: '23',
  OFFLINE_CONNECTION_ERROR: '35',
} as const;

export function purchaseErrorKind(error: unknown): PurchaseErrorKind {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case PURCHASE_ERROR_CODES.PURCHASE_CANCELLED_ERROR:
      return 'cancelled';
    case PURCHASE_ERROR_CODES.NETWORK_ERROR:
    case PURCHASE_ERROR_CODES.OFFLINE_CONNECTION_ERROR:
      return 'network';
    case PURCHASE_ERROR_CODES.PRODUCT_ALREADY_PURCHASED_ERROR:
      return 'already_owned';
    case PURCHASE_ERROR_CODES.STORE_PROBLEM_ERROR:
    case PURCHASE_ERROR_CODES.PURCHASE_NOT_ALLOWED_ERROR:
    case PURCHASE_ERROR_CODES.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASE_ERROR_CODES.CONFIGURATION_ERROR:
      return 'unavailable';
    default:
      return 'other';
  }
}
