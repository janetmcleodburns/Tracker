// Local-date helpers. Every date in the database is a plain 'YYYY-MM-DD' string
// meaning a calendar day in Janet's local time zone. Never pass those strings to
// new Date(str) (that parses as UTC midnight and shifts the day in Pacific time).

export const clock = { now: () => new Date() }; // overridable in tests

const pad = n => String(n).padStart(2, '0');

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() { return toISODate(clock.now()); }

export function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// Whole days from a to b (DST-safe).
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function fmt(s) {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${m}/${d}/${y}`;
}

// Friendly relative label: "Today", "Tomorrow", "Yesterday", "3 days ago", else m/d/y.
export function rel(s, ref = today()) {
  if (!s) return '';
  const n = daysBetween(ref, s.slice(0, 10));
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0 && n > -14) return `${-n} days ago`;
  return fmt(s);
}

export function nextWeekday(s, weekday) { // first date strictly after s that falls on weekday (0=Sun)
  const d = parseDate(s);
  const diff = ((weekday - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}
