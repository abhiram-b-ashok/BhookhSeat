import type { TableType } from '../../restaurants/domain/restaurant.types';

/**
 * How many tables of one type are already taken by OTHER (fictional) diners for a
 * given restaurant, date and slot. Returns a whole number from 0 to totalTables.
 */
export type DemandFn = (
  restaurantId: string,
  date: string,
  time: string,
  tableType: TableType,
  totalTables: number,
) => number;

/** FNV-1a hash mapped to [0, 1). Deterministic: same input, same output, on every device. */
function hash01(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0x100000000;
}

/**
 * Demo demand. Roughly one in (total + 1) table types is fully booked per slot, and the
 * rest are partly booked. This is simulated data, not real restaurant availability.
 */
export const simulatedDemand: DemandFn = (restaurantId, date, time, tableType, totalTables) => {
  const r = hash01(`${restaurantId}|${date}|${time}|${tableType}`);
  return Math.min(totalTables, Math.floor(r * (totalTables + 1)));
};

/** No other diners at all. Used by tests that need full control. */
export const noDemand: DemandFn = () => 0;
