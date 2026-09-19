// Date helpers. All timestamps are epoch milliseconds (number). Weeks are Monday-first.
// Local time is used on purpose: the user's calendar day decides which day a record belongs to.

export type Ms = number;

export interface Interval {
  start: Ms;
  end: Ms;
}

export const DAY_MS = 86_400_000;

export function startOfDay(ms: Ms): Ms {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Adds calendar days (DST-safe, keeps the time of day). */
export function addDays(ms: Ms, days: number): Ms {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function addWeeks(ms: Ms, weeks: number): Ms {
  return addDays(ms, weeks * 7);
}

/** Monday 00:00 of the week containing `ms`. */
export function startOfWeek(ms: Ms): Ms {
  const day = startOfDay(ms);
  const weekday = new Date(day).getDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  return addDays(day, -sinceMonday);
}

export function weekInterval(ms: Ms): Interval {
  const start = startOfWeek(ms);
  return { start, end: addDays(start, 7) };
}

export function monthInterval(ms: Ms): Interval {
  const d = new Date(ms);
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
  };
}

export function yearInterval(ms: Ms): Interval {
  const d = new Date(ms);
  return {
    start: new Date(d.getFullYear(), 0, 1).getTime(),
    end: new Date(d.getFullYear() + 1, 0, 1).getTime(),
  };
}

/** Half-open containment: start <= value < end. */
export function isInside(ms: Ms, interval: Interval): boolean {
  return ms >= interval.start && ms < interval.end;
}

/** Whole calendar days between two instants (by start of day). */
export function daysBetween(from: Ms, to: Ms): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function isSameWeek(a: Ms, b: Ms): boolean {
  return startOfWeek(a) === startOfWeek(b);
}

/** Remaining full days in the current week after today (Mon = 6 ... Sun = 0). */
export function remainingDaysInWeek(now: Ms): number {
  const weekday = new Date(now).getDay();
  const sinceMonday = (weekday + 6) % 7;
  return 6 - sinceMonday;
}

export const WEEKDAY_LABELS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const MONTH_LABELS_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const;

/** Random RFC4122 v4 id (crypto.randomUUID is not guaranteed in React Native). */
export function newId(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else {
      const r = Math.floor(Math.random() * 16);
      out += hex[i === 19 ? (r & 3) | 8 : r];
    }
  }
  return out;
}
