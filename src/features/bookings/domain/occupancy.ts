import type { TableType } from '../../restaurants/domain/restaurant.types';
import type { Booking } from './booking.types';
import { simulatedDemand, type DemandFn } from './simulatedDemand';

/**
 * Tables held by REAL bookings (every user's), for one restaurant on one date.
 * Keyed by slot start time ("19:30"), then table type. Stored in Firestore, one
 * document per restaurant per day, and changed only inside a transaction.
 */
export type OccupancyCounts = Record<string, Partial<Record<TableType, number>>>;

const TABLE_TYPES: readonly TableType[] = ['couple', 'standard', 'family', 'large_group'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const occupancyDocId = (restaurantId: string, date: string) => `${restaurantId}_${date}`;

/** Never throws. Keeps only well-formed entries. */
export function parseOccupancyCounts(value: unknown): OccupancyCounts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: OccupancyCounts = {};
  for (const [time, perType] of Object.entries(value)) {
    if (!TIME_RE.test(time) || typeof perType !== 'object' || perType === null) continue;
    const slot: Partial<Record<TableType, number>> = {};
    for (const type of TABLE_TYPES) {
      const n = (perType as Record<string, unknown>)[type];
      if (typeof n === 'number' && Number.isInteger(n) && n > 0) slot[type] = n;
    }
    if (Object.keys(slot).length > 0) result[time] = slot;
  }
  return result;
}

/** Returns a new object. Counts never go below zero, and empty entries are dropped. */
export function adjustCounts(
  counts: OccupancyCounts,
  time: string,
  tableType: TableType,
  delta: number,
): OccupancyCounts {
  const next = Math.max(0, (counts[time]?.[tableType] ?? 0) + delta);
  const slot = { ...counts[time] };
  if (next === 0) delete slot[tableType];
  else slot[tableType] = next;

  const result = { ...counts };
  if (Object.keys(slot).length === 0) delete result[time];
  else result[time] = slot;
  return result;
}

type SharedDemandArgs = {
  counts: OccupancyCounts;
  /** The signed-in user's own bookings. They are already inside `counts`. */
  ownBookings: Booking[];
  restaurantId: string;
  date: string;
  baseDemand?: DemandFn;
};

/**
 * Demand = the fictional crowd + real bookings made by OTHER people.
 * `counts` includes the user's own bookings, but the booking rules already count those
 * separately, so they are taken out here to avoid counting them twice.
 */
export function buildSharedDemand({
  counts,
  ownBookings,
  restaurantId,
  date,
  baseDemand = simulatedDemand,
}: SharedDemandArgs): DemandFn {
  return (rid, d, time, type, total) => {
    const base = baseDemand(rid, d, time, type, total);
    if (rid !== restaurantId || d !== date) return base;

    const shared = counts[time]?.[type] ?? 0;
    const own = ownBookings.filter(
      (b) =>
        b.status === 'confirmed' &&
        b.restaurantId === rid &&
        b.date === d &&
        b.time === time &&
        b.tableType === type,
    ).length;
    return Math.min(total, base + Math.max(0, shared - own));
  };
}
