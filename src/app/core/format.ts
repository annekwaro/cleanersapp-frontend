// Change these two to localise money everywhere in the app.
const CURRENCY = 'USD';
const LOCALE = undefined; // browser default

const money0 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

export function money(value: number | null | undefined): string {
  const v = value ?? 0;
  return Number.isInteger(v) ? money0.format(v) : money2.format(v);
}

export function initials(name: string | null | undefined): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Backend sends LocalDateTime without a zone; `new Date` reads that as local time. */
export function toDate(value: string): Date {
  return new Date(value);
}

/** Local wall-clock time in the shape the backend's LocalDateTime expects. */
export function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-based week start. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const s = startOfDay(d);
  s.setDate(s.getDate() - day);
  return s;
}

export function dayLabel(d: Date): string {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function timeRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${toDate(start).toLocaleTimeString(undefined, opts)} – ${toDate(end).toLocaleTimeString(undefined, opts)}`;
}

/** "2m", "3h", "Tue", "12 Oct" — for inbox rows. */
export function relativeShort(value: string | null): string {
  if (!value) return '';
  const d = toDate(value);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  if (mins < 7 * 24 * 60) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const DAY_NAMES: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};
