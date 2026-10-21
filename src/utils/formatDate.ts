import { parseISODate } from "./dateTime";

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "19:30" -> "7:30 PM". Done by hand so it behaves the same on every device. */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2026-10-21" -> "Wed, Oct 21" */
export function formatShortDate(isoDate: string): string {
  return parseISODate(isoDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Pieces for a calendar tile: { weekday: "Wed", day: "21", month: "Oct" } */
export function getDateParts(isoDate: string) {
  const date = parseISODate(isoDate);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}