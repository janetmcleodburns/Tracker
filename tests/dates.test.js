// Run: cd v2 && npm test   (TZ=America/Los_Angeles node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { clock, today, addDays, parseDate, fmt, rel, daysBetween, nextWeekday } from '../js/dates.js';
import { generateDates, parseRecurring, nextInstance, describeRule } from '../js/recurrence.js';

const at = iso => { clock.now = () => new Date(iso); };

test('runs in Pacific time', () => {
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/Los_Angeles');
});

test('6 PM PT is still the same local day (old code said tomorrow after 5 PM)', () => {
  at('2026-10-08T18:00:00-07:00');
  assert.equal(new Date().toISOString().length > 0, true);
  assert.equal(today(), '2026-10-08');
  assert.equal(new Date('2026-10-09T01:00:00Z').toISOString().split('T')[0], '2026-10-09'); // the old bug
  at('2026-10-08T23:59:59-07:00');
  assert.equal(today(), '2026-10-08');
  at('2026-10-09T00:00:01-07:00');
  assert.equal(today(), '2026-10-09');
});

test('parseDate is local midnight, not UTC', () => {
  const d = parseDate('2026-10-08');
  assert.equal(d.getDate(), 8);
  assert.equal(d.getHours(), 0);
  // old: new Date('2026-10-08') is Oct 7 5 PM in Pacific time
  assert.equal(new Date('2026-10-08').getDate(), 7);
});

test('addDays / daysBetween across DST change (Nov 1 2026)', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02');
  assert.equal(addDays('2026-03-07', 1), '2026-03-08');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(daysBetween('2026-10-25', '2026-11-05'), 11);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('fmt / rel / nextWeekday', () => {
  assert.equal(fmt('2026-10-08'), '10/08/2026');
  assert.equal(rel('2026-10-08', '2026-10-08'), 'Today');
  assert.equal(rel('2026-10-09', '2026-10-08'), 'Tomorrow');
  assert.equal(rel('2026-10-05', '2026-10-08'), '3 days ago');
  assert.equal(nextWeekday('2026-10-08', 1), '2026-10-12'); // Thu -> Mon
  assert.equal(nextWeekday('2026-10-12', 1), '2026-10-19'); // Mon -> next Mon
});

test('monthly recurrence clamps to month end and stays local', () => {
  const d = generateDates({ pattern: 'monthly_day', start: '2026-10-08', end: '2027-03-31', day: 31 });
  assert.deepEqual(d, ['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  const d15 = generateDates({ pattern: 'monthly_day', start: '2026-10-15', end: '2026-12-31', day: 15 });
  assert.deepEqual(d15, ['2026-10-15', '2026-11-15', '2026-12-15']);
});

test('weekly and every-x-days recurrence', () => {
  assert.deepEqual(generateDates({ pattern: 'weekly', start: '2026-10-08', end: '2026-10-31', weekday: 1 }),
    ['2026-10-12', '2026-10-19', '2026-10-26']);
  assert.deepEqual(generateDates({ pattern: 'every_x_days', start: '2026-10-30', end: '2026-11-10', days: 3 }),
    ['2026-10-30', '2026-11-02', '2026-11-05', '2026-11-08']);
});

test('reads the format the original page saved', () => {
  const saved = '{"pattern":{"pattern":"monthly_day","start":"2026-07-15","end":"","day":15},"dates":["2026-10-15","2026-11-15"]}';
  const { rule, dates } = parseRecurring(saved);
  assert.equal(rule.pattern, 'monthly_day');
  assert.equal(rule.day, 15);
  assert.deepEqual(dates, ['2026-10-15', '2026-11-15']);
  assert.deepEqual(parseRecurring('[]'), { rule: null, dates: [] });
  assert.equal(describeRule(rule), 'Monthly on the 15th');
});

test('nextInstance: completing early does not recreate the same due date', () => {
  at('2026-10-08T18:00:00-07:00');
  const task = { recurring: true, due: '2026-10-15', recurring_dates: JSON.stringify({ pattern: { pattern: 'monthly_day', start: '2026-07-15', end: '', day: 15 }, dates: ['2026-10-15', '2026-11-15', '2026-12-15'] }) };
  const n = nextInstance(task);
  assert.equal(n.due, '2026-11-15');
  assert.deepEqual(JSON.parse(n.recurring_dates).dates, ['2026-12-15']);
  assert.equal(n.recurring, true);
});

test('nextInstance: completing late skips to the first future date', () => {
  at('2026-10-08T18:00:00-07:00');
  const task = { recurring: true, due: '2026-09-01', recurring_dates: JSON.stringify({ pattern: { pattern: 'monthly_day', start: '2026-07-01', end: '', day: 1 }, dates: ['2026-09-01', '2026-10-01', '2026-11-01'] }) };
  assert.equal(nextInstance(task).due, '2026-11-01');
});

test('nextInstance: regenerates from the rule when the stored list runs out', () => {
  at('2026-10-08T18:00:00-07:00');
  const task = { recurring: true, due: '2026-10-05', recurring_dates: JSON.stringify({ pattern: { pattern: 'weekly', start: '2026-09-01', end: '', weekday: 1 }, dates: [] }) };
  assert.equal(nextInstance(task).due, '2026-10-12');
  const ended = { recurring: true, due: '2026-10-05', recurring_dates: JSON.stringify({ pattern: { pattern: 'weekly', start: '2026-09-01', end: '2026-10-06', weekday: 1 }, dates: [] }) };
  assert.equal(nextInstance(ended), null);
});

import { planOrder } from '../js/order.js';
const apply = (rows, vals) => rows.map((r, i) => ({ ...r, sort_order: vals[i] }));
const sortedIds = rows => [...rows].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)).map(r => r.id);

test('planOrder: dense list, swap neighbours -> 2 writes', () => {
  const rows = [0, 1, 2, 3].map(i => ({ id: 10 + i, sort_order: i }));
  const want = [rows[1], rows[0], rows[2], rows[3]];
  const vals = planOrder(want);
  assert.deepEqual(sortedIds(apply(want, vals)), want.map(r => r.id));
  assert.ok(want.filter((r, i) => r.sort_order !== vals[i]).length <= 2);
});

test('planOrder: duplicates (999s from bulk inserts) are not all rewritten', () => {
  const rows = [3, 5, 6, 7, 8, 9, 10, 11, 12].map((v, i) => ({ id: 100 + i, sort_order: v }))
    .concat(Array.from({ length: 11 }, (_, i) => ({ id: 500 + i, sort_order: 999 })));
  const want = [rows[1], rows[2], rows[0], ...rows.slice(3)];
  const vals = planOrder(want);
  assert.deepEqual(sortedIds(apply(want, vals)), want.map(r => r.id));
  assert.ok(want.filter((r, i) => r.sort_order !== vals[i]).length <= 3);
});

test('planOrder: move to top / bottom, nulls, random shuffles always produce the requested order', () => {
  for (let trial = 0; trial < 300; trial++) {
    const n = 1 + Math.floor(Math.random() * 12);
    const rows = Array.from({ length: n }, (_, i) => ({ id: 1000 + Math.floor(Math.random() * 50) * 7 + i, sort_order: Math.random() < 0.15 ? null : Math.floor(Math.random() * 6) }));
    const want = [...rows].sort(() => Math.random() - 0.5);
    const vals = planOrder(want);
    assert.ok(vals.every(v => Number.isInteger(v) && v >= 0));
    assert.deepEqual(sortedIds(apply(want, vals)), want.map(r => r.id));
  }
});
