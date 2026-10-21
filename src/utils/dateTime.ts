/**
 * Booking dates are stored as "YYYY-MM-DD" and times as "HH:mm", both meaning
 * the device's local time. Everything here is pure so it can be unit tested.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidTime(time: string): boolean {
  return TIME_RE.test(time);
}

export function isValidISODate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects things like 2026-02-31, which JavaScript would silently roll over.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of an ISO date. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Adds whole calendar days and returns local midnight of the result. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function toDateTime(isoDate: string, time: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}
