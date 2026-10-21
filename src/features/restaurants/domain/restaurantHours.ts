
import type { Weekday } from './restaurant.types';

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Date.getDay() returns 0 for Sunday.
const BY_JS_DAY: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function getWeekday(date: Date): Weekday {
  return BY_JS_DAY[date.getDay()];
}