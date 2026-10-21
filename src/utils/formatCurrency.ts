
const SYMBOLS: Record<string, string> = { INR: '₹' };

export function formatCurrency(amount: number, currency = 'INR'): string {
  return `${SYMBOLS[currency] ?? `${currency} `}${amount}`;
}

/** Price level 2 -> "₹₹". */
export function formatPriceLevel(level: number, currency = 'INR'): string {
  return (SYMBOLS[currency] ?? '$').repeat(level);
}