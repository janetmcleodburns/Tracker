// Recurring-task rules. Storage format is unchanged from the original page:
// recurring_dates = JSON string {"pattern":{pattern,start,end,day|days|weekday},"dates":[...]}
// (or '[]' when not recurring).
import { today, parseDate, toISODate, addDays } from './dates.js';

function lastDayOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

export function generateDates(rule) {
  const start = rule.start || today();
  const end = rule.end || addDays(start, 730);
  const dates = [];
  if (rule.pattern === 'every_x_days') {
    const x = Math.max(1, parseInt(rule.days) || 7);
    for (let cur = start; cur <= end && dates.length < 120; cur = addDays(cur, x)) dates.push(cur);
  } else if (rule.pattern === 'weekly') {
    const wd = Number.isInteger(+rule.weekday) ? +rule.weekday : 1;
    const s = parseDate(start);
    let cur = addDays(start, (wd - s.getDay() + 7) % 7);
    for (; cur <= end && dates.length < 104; cur = addDays(cur, 7)) dates.push(cur);
  } else { // monthly_day
    const day = Math.min(31, Math.max(1, parseInt(rule.day) || 1));
    const s = parseDate(start);
    let y = s.getFullYear(), m = s.getMonth();
    const at = (yy, mm) => toISODate(new Date(yy, mm, Math.min(day, lastDayOfMonth(yy, mm))));
    let cur = at(y, m);
    if (cur < start) { m++; cur = at(y, m); }
    while (cur <= end && dates.length < 60) {
      dates.push(cur);
      m++; cur = at(y, m);
    }
  }
  return dates;
}

export function parseRecurring(str) {
  let obj;
  try { obj = typeof str === 'string' ? JSON.parse(str || '{}') : (str || {}); } catch { obj = {}; }
  if (!obj || Array.isArray(obj)) return { rule: null, dates: Array.isArray(obj) ? obj : [] };
  // Original page saved {pattern:{pattern:'monthly_day',...}, dates:[...]}
  const rule = obj.pattern && typeof obj.pattern === 'object' ? obj.pattern
    : (typeof obj.pattern === 'string' ? obj : null);
  return { rule, dates: Array.isArray(obj.dates) ? obj.dates : [] };
}

export function serializeRecurring(rule) {
  return JSON.stringify({ pattern: rule, dates: generateDates(rule) });
}

// Given a completed recurring task, return the fields for the next instance, or null.
export function nextInstance(task, ref = today()) {
  if (!task.recurring) return null;
  const { rule, dates } = parseRecurring(task.recurring_dates);
  // Next date must be after today AND after the current due date (completing early
  // must not recreate the same due date).
  const after = task.due && task.due > ref ? task.due : ref;
  let future = dates.filter(d => d > after).sort();
  if (!future.length && rule) {
    future = generateDates({ ...rule, start: addDays(after, 1) }).filter(d => d > after && (!rule.end || d <= rule.end));
  }
  if (!future.length) return null;
  const remaining = future.slice(1);
  return {
    due: future[0],
    recurring: remaining.length > 0 || !!(rule && (!rule.end || rule.end > future[0])),
    recurring_dates: JSON.stringify({ pattern: rule || undefined, dates: remaining }),
  };
}

export function describeRule(rule) {
  if (!rule) return 'Recurring';
  const wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  if (rule.pattern === 'every_x_days') return `Every ${rule.days || 7} day(s)`;
  if (rule.pattern === 'weekly') return `Every ${wd[+rule.weekday || 0]}`;
  return `Monthly on the ${ord(+rule.day || 1)}`;
}
