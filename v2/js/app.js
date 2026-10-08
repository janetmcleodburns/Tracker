// Janet's Tracker v2: one generic code path for the four lists
// (Work WTHBF, Work Tasks, Personal WTHBF, Personal Tasks).
import { today, addDays, fmt, rel, nextWeekday } from './dates.js';
import { api } from './api.js';
import { generateDates, parseRecurring, nextInstance, describeRule } from './recurrence.js';
import { $, esc, linkify, toast, setSync, startMic, micBtn } from './ui.js';
import { makeSortable } from './drag.js';
import { planOrder } from './order.js';
import { initSprint, sprintAddTask } from './sprint.js';
import { initQuickLinks } from './quicklinks.js';
import { checkReminders, requestNotificationPermission } from './reminders.js';

// ── Config ───────────────────────────────────────────────────────────────────
const LISTS = {
  w: { table: 'wthbf', kind: 'wthbf', personal: false, label: 'Work WTHBF' },
  t: { table: 'tasks', kind: 'task', personal: false, label: 'Work Task' },
  pw: { table: 'personal_wthbf', kind: 'wthbf', personal: true, label: 'Personal WTHBF' },
  pt: { table: 'personal_tasks', kind: 'task', personal: true, label: 'Personal Task' },
};
const KEYS = Object.keys(LISTS);
const PERSONAL_CATS = ['Personal', 'Home', 'Health', 'Family', 'Finance'];
const PRI = ['High', 'Medium', 'Low'];
const PRANK = { High: 0, Medium: 1, Low: 2 };
const VIEWS = {
  today: { label: '📌 Today' },
  w: { list: 'w', label: '⏳ WTHBF' }, t: { list: 't', label: '✅ Tasks' }, wc: { completed: ['w', 't'], label: '🏆 Completed' },
  pw: { list: 'pw', label: '⏳ WTHBF' }, pt: { list: 'pt', label: '✅ Tasks' }, pc: { completed: ['pw', 'pt'], label: '🏆 Completed' },
};
const isPersonalView = v => ['pw', 'pt', 'pc'].includes(v);
const UI_KEY = 'tracker-v2-ui';
const VIEW_KEY = 'tracker-v2-view';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  rows: { w: [], t: [], pw: [], pt: [] },
  cats: [],
  loaded: false, loadError: null, lastLoad: 0, day: today(),
  view: 'today',
  editing: null, editDraft: null,
  menu: null,
};
const defaultUi = () => ({
  search: '',
  views: {
    today: { scope: 'all' },
    w: { filter: 'all', sort: 'manual', showUpcoming: false },
    t: { filter: 'all', cat: 'all', sort: 'manual', showUpcoming: false },
    pw: { filter: 'all', sort: 'manual', showUpcoming: false },
    pt: { filter: 'all', cat: 'all', sort: 'manual', showUpcoming: false },
    wc: { filter: 'all', limit: 50 }, pc: { filter: 'all', limit: 50 },
  },
});
const ui = defaultUi();
try { // remember sort choices between visits
  const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
  for (const v of ['w', 't', 'pw', 'pt']) if (['manual', 'due', 'priority'].includes(saved[v]?.sort)) ui.views[v].sort = saved[v].sort;
} catch { /* ignore */ }
const saveUi = () => localStorage.setItem(UI_KEY, JSON.stringify(Object.fromEntries(['w', 't', 'pw', 'pt'].map(v => [v, { sort: ui.views[v].sort }]))));

// ── Derived data ─────────────────────────────────────────────────────────────
const find = (k, id) => state.rows[k].find(r => r.id === id);
const dateOf = (k, r) => (LISTS[k].kind === 'wthbf' ? r.followup : r.due) || null;
const isOverdue = (k, r) => { const d = dateOf(k, r); return !!d && d < today(); };
const isHiddenRecurring = (k, r) => LISTS[k].kind === 'task' && r.recurring && r.due && r.due > addDays(today(), 1);
const so = r => (Number.isFinite(r.sort_order) ? r.sort_order : Infinity);
const byManual = (a, b) => (so(a) - so(b)) || (a.id - b.id);
const cmpDate = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1);
const byPriority = (a, b) => (PRANK[a.priority] ?? 3) - (PRANK[b.priority] ?? 3);
const active = k => state.rows[k].filter(r => !r.completed).sort(byManual);
const query = () => ui.search.trim().toLowerCase();
const matches = (r, q) => !q || [r.name, r.waiting, r.notes, r.category].some(v => v && String(v).toLowerCase().includes(q));
const nextOrder = k => Math.max(-1, ...active(k).map(r => (Number.isFinite(r.sort_order) ? r.sort_order : -1))) + 1;
const visibleCount = k => active(k).filter(r => !isHiddenRecurring(k, r)).length;

function visibleList(k) {
  const v = ui.views[k];
  const q = query();
  let items = active(k);
  const hiddenCount = items.filter(r => isHiddenRecurring(k, r)).length;
  if (!v.showUpcoming) items = items.filter(r => !isHiddenRecurring(k, r));
  if (v.filter === 'overdue') items = items.filter(r => isOverdue(k, r));
  else if (v.filter !== 'all') items = items.filter(r => r.priority === v.filter);
  if (v.cat && v.cat !== 'all') items = items.filter(r => r.category === v.cat);
  if (q) items = items.filter(r => matches(r, q));
  if (v.sort === 'due') items.sort((a, b) => cmpDate(dateOf(k, a), dateOf(k, b)) || byManual(a, b));
  else if (v.sort === 'priority') items.sort((a, b) => byPriority(a, b) || cmpDate(dateOf(k, a), dateOf(k, b)) || byManual(a, b));
  return { items, hiddenCount };
}

function todayGroups() {
  const t = today(), q = query(), scope = ui.views.today.scope;
  const g = { overdue: [], due: [], follow: [] };
  for (const k of KEYS) {
    if (scope === 'work' && LISTS[k].personal) continue;
    if (scope === 'personal' && !LISTS[k].personal) continue;
    for (const r of active(k)) {
      const d = dateOf(k, r);
      if (!d || d > t || !matches(r, q)) continue;
      if (d < t) g.overdue.push({ k, r });
      else (LISTS[k].kind === 'task' ? g.due : g.follow).push({ k, r });
    }
  }
  g.overdue.sort((a, b) => cmpDate(dateOf(a.k, a.r), dateOf(b.k, b.r)) || byPriority(a.r, b.r));
  g.due.sort((a, b) => byPriority(a.r, b.r) || byManual(a.r, b.r));
  g.follow.sort((a, b) => byPriority(a.r, b.r) || byManual(a.r, b.r));
  return g;
}

function allOverdueCount() { return KEYS.reduce((n, k) => n + active(k).filter(r => isOverdue(k, r)).length, 0); }
function dueTodayCount() { const t = today(); return KEYS.reduce((n, k) => n + active(k).filter(r => dateOf(k, r) === t).length, 0); }

// ── Sync helpers (optimistic updates with rollback) ──────────────────────────
let pending = 0;
const begin = () => { pending++; setSync('syncing'); };
const end = err => { pending = Math.max(0, pending - 1); if (err) setSync('error', 'Last save failed'); else if (!pending) setSync('ok'); };

async function updateRow(k, id, patch, what) {
  const r = find(k, id);
  if (!r) return false;
  const old = {};
  for (const f in patch) old[f] = r[f];
  Object.assign(r, patch);
  render();
  begin();
  try {
    const saved = await api.update(LISTS[k].table, id, patch);
    if (saved) Object.assign(r, saved);
    end(); render();
    return true;
  } catch (e) {
    Object.assign(r, old);
    end(true); render();
    toast(`Couldn't ${what}: ${e.message}. Your change was undone.`, { type: 'error' });
    return false;
  }
}

async function insertRows(k, rows, what) {
  begin();
  try {
    const saved = await api.insert(LISTS[k].table, rows);
    state.rows[k].push(...saved);
    end(); render();
    return saved;
  } catch (e) {
    end(true);
    toast(`Couldn't ${what}: ${e.message}`, { type: 'error' });
    return null;
  }
}

async function removeNow(k, id) {
  const r = find(k, id);
  if (!r) return;
  state.rows[k].splice(state.rows[k].indexOf(r), 1);
  render(); begin();
  try { await api.remove(LISTS[k].table, id); end(); }
  catch (e) { state.rows[k].push(r); end(true); render(); toast(`Couldn't delete “${r.name}”: ${e.message}`, { type: 'error' }); }
}

// Delete with a 5-second Undo window (flushed immediately if the page is hidden/closed).
const pendingDeletes = new Map();
function deleteWithUndo(k, id) {
  const r = find(k, id);
  if (!r) return;
  state.rows[k].splice(state.rows[k].indexOf(r), 1);
  if (state.editing?.id === id) state.editing = null;
  render();
  const key = `${k}:${id}`;
  const commit = async (keepalive = false) => {
    const p = pendingDeletes.get(key);
    if (!p) return;
    clearTimeout(p.timer);
    pendingDeletes.delete(key);
    begin();
    try { await api.remove(LISTS[k].table, id, { keepalive }); end(); }
    catch (e) { end(true); state.rows[k].push(r); render(); toast(`Couldn't delete “${r.name}”: ${e.message}. It's back in the list.`, { type: 'error' }); }
  };
  pendingDeletes.set(key, { timer: setTimeout(commit, 5000), commit });
  toast(`Deleted “${r.name}”`, {
    action: 'Undo', timeout: 5000,
    onAction: () => {
      const p = pendingDeletes.get(key);
      if (!p) return;
      clearTimeout(p.timer); pendingDeletes.delete(key);
      state.rows[k].push(r); render();
    },
  });
}
const flushDeletes = () => { for (const p of [...pendingDeletes.values()]) p.commit(true); };

// ── Actions ──────────────────────────────────────────────────────────────────
async function addItem(k, form) {
  const L = LISTS[k], f = form.elements;
  const required = L.kind === 'wthbf' ? [f.name, f.waiting] : [f.name];
  let ok = true;
  required.forEach(el => { const empty = !el.value.trim(); el.classList.toggle('required-empty', empty); if (empty) ok = false; });
  if (!ok) { required.find(el => !el.value.trim())?.focus(); return; }
  const row = { name: f.name.value.trim(), priority: f.priority.value, added: today(), sort_order: nextOrder(k) };
  if (L.kind === 'wthbf') Object.assign(row, { waiting: f.waiting.value.trim(), followup: f.followup.value || null });
  else Object.assign(row, { category: f.category.value, due: f.due.value || null, notes: f.notes.value.trim() || null });
  const btn = form.querySelector('[type=submit]');
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving…';
  const saved = await insertRows(k, [row], 'add the item');
  btn.disabled = false; btn.textContent = label;
  if (saved) {
    const cat = f.category?.value;
    form.reset();
    if (f.category) f.category.value = cat;
    const shown = visibleList(k).items.some(r => r.id === saved[0].id);
    toast(`Added “${row.name}”${shown ? '' : ' (hidden by the current filter/search)'}`);
  }
}

async function complete(k, id) {
  const r = find(k, id);
  if (!r) return;
  if (!(await updateRow(k, id, { completed: true, completed_at: today() }, 'mark it complete'))) return;
  let spawned = null;
  if (LISTS[k].kind === 'task' && r.recurring) {
    const next = nextInstance(r);
    if (next) {
      const row = {
        name: r.name, notes: r.notes ?? null, priority: r.priority, category: r.category ?? (k === 't' ? 'Work' : 'Personal'),
        added: today(), sort_order: nextOrder(k), reminder: !!r.reminder, reminder_sent: false, ...next,
      };
      spawned = (await insertRows(k, [row], 'create the next recurring task'))?.[0] || null;
    }
  }
  toast(spawned ? `Completed “${r.name}”. Next one is due ${fmt(spawned.due)}.` : `Completed “${r.name}”`, {
    action: 'Undo', timeout: 6000,
    onAction: async () => {
      await updateRow(k, id, { completed: false, completed_at: null }, 'undo');
      if (spawned) await removeNow(k, spawned.id);
    },
  });
}

const restore = (k, id) => updateRow(k, id, { completed: false, completed_at: null }, 'restore it');

function snooze(k, id, how) {
  const t = today();
  const date = how === 'mon' ? nextWeekday(t, 1) : addDays(t, +how);
  const patch = LISTS[k].kind === 'wthbf' ? { followup: date } : { due: date, reminder_sent: false };
  updateRow(k, id, patch, 'change the date').then(ok => ok && toast(`Moved to ${fmt(date)}`));
}

function mapRow(r, k, k2) {
  const A = LISTS[k], B = LISTS[k2];
  const row = { name: r.name, priority: r.priority || 'Medium', added: r.added || today(), sort_order: nextOrder(k2) };
  if (B.kind === 'wthbf') {
    row.waiting = A.kind === 'wthbf' ? r.waiting : (r.notes || r.name);
    row.followup = (A.kind === 'wthbf' ? r.followup : r.due) ?? null;
  } else {
    row.notes = (A.kind === 'task' ? r.notes : r.waiting) || null;
    row.due = (A.kind === 'task' ? r.due : r.followup) ?? null;
    row.category = B.personal
      ? (PERSONAL_CATS.includes(r.category) ? r.category : 'Personal')
      : (A.personal || !state.cats.includes(r.category) ? (state.cats.includes('Work') ? 'Work' : state.cats[0] || 'Work') : r.category);
    if (A.kind === 'task') Object.assign(row, { reminder: !!r.reminder, reminder_sent: !!r.reminder_sent, recurring: !!r.recurring, recurring_dates: r.recurring_dates ?? '[]' });
  }
  return row;
}

async function convert(k, id, k2) {
  const r = find(k, id);
  if (!r) return;
  begin();
  let saved;
  try { [saved] = await api.insert(LISTS[k2].table, mapRow(r, k, k2)); }
  catch (e) { end(true); toast(`Couldn't move “${r.name}”: ${e.message}`, { type: 'error' }); return; }
  state.rows[k2].push(saved);
  state.rows[k].splice(state.rows[k].indexOf(r), 1);
  render();
  try {
    await api.remove(LISTS[k].table, id);
    end();
    toast(`Moved “${r.name}” to ${LISTS[k2].label}`, { action: 'Go there', onAction: () => setView(k2) });
  } catch (e) {
    end(true); state.rows[k].push(r); render();
    toast(`Copied to ${LISTS[k2].label}, but couldn't remove the original: ${e.message}`, { type: 'error' });
  }
}

// Reorder: only rows whose sort_order changes are written (see order.js).
async function applyOrder(k, ids) {
  const rows = ids.map(id => find(k, id));
  const values = planOrder(rows);
  const changed = [];
  rows.forEach((r, i) => { if (r.sort_order !== values[i]) { changed.push({ r, old: r.sort_order }); r.sort_order = values[i]; } });
  if (!changed.length) return;
  render();
  begin();
  const results = await Promise.allSettled(changed.map(c => api.update(LISTS[k].table, c.r.id, { sort_order: c.r.sort_order })));
  const failed = results.filter(x => x.status === 'rejected').length;
  end(failed > 0);
  if (failed) {
    changed.forEach(c => { c.r.sort_order = c.old; });
    render();
    toast(`Couldn't save the new order (${failed} of ${changed.length} updates failed). Reloading from the server.`, { type: 'error' });
    load(true);
  }
}

function moveRelative(k, id, targetId, after) {
  if (id === targetId) return;
  const ids = active(k).map(r => r.id).filter(x => x !== id);
  const idx = ids.indexOf(targetId);
  if (idx < 0) return;
  ids.splice(after ? idx + 1 : idx, 0, id);
  applyOrder(k, ids);
}

function moveOp(k, id, op) {
  const vis = visibleList(k).items;
  const all = active(k);
  const i = vis.findIndex(r => r.id === id);
  if (op === 'up' && i > 0) moveRelative(k, id, vis[i - 1].id, false);
  else if (op === 'down' && i >= 0 && i < vis.length - 1) moveRelative(k, id, vis[i + 1].id, true);
  else if (op === 'top') moveRelative(k, id, all[0].id, false);
  else if (op === 'bottom') moveRelative(k, id, all[all.length - 1].id, true);
}

// ── Rendering ────────────────────────────────────────────────────────────────
const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
const catsFor = k => (LISTS[k].personal ? PERSONAL_CATS : state.cats);

function dateMeta(k, r) {
  const d = dateOf(k, r);
  if (!d) return '';
  const t = today();
  const cls = !r.completed && d < t ? 'od' : d === t ? 'due-today' : '';
  const relTxt = rel(d, t);
  return `<span class="${cls}">${LISTS[k].kind === 'task' ? '⚑ Due' : '🔔 Follow up'} ${fmt(d)}${relTxt !== fmt(d) ? ` · ${relTxt}` : ''}</span>`;
}

function editFormHTML(k, r) {
  const d = state.editDraft || {};
  const val = f => d[f] ?? r[f] ?? '';
  const isTask = LISTS[k].kind === 'task';
  const cats = [...catsFor(k)];
  if (isTask && r.category && !cats.includes(r.category)) cats.push(r.category);
  return `<form class="edit-form" data-edit-form>
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="ef-name">${isTask ? 'Task' : 'Contact name'}</label>
        <div class="input-with-mic"><input type="text" id="ef-name" name="name" value="${esc(val('name'))}">${micBtn('ef-name')}</div></div>
      <div class="form-col"><label class="form-label" for="ef-pri">Priority</label>
        <select id="ef-pri" name="priority">${PRI.map(p => opt(p, val('priority') || 'Medium')).join('')}</select></div>
    </div>
    ${isTask ? `
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="ef-cat">Category</label>
        <select id="ef-cat" name="category">${cats.map(c => opt(c, val('category'))).join('')}</select></div>
      <div class="form-col"><label class="form-label" for="ef-due">Due date</label><input type="date" id="ef-due" name="due" value="${esc(val('due'))}"></div>
    </div>
    <div class="form-col"><label class="form-label" for="ef-notes">Notes</label>
      <div class="input-with-mic"><textarea id="ef-notes" name="notes" rows="2">${esc(val('notes'))}</textarea>${micBtn('ef-notes')}</div></div>`
    : `
    <div class="form-col"><label class="form-label" for="ef-waiting">What I'm waiting on</label>
      <div class="input-with-mic"><input type="text" id="ef-waiting" name="waiting" value="${esc(val('waiting'))}">${micBtn('ef-waiting')}</div></div>
    <div class="form-col"><label class="form-label" for="ef-followup">Follow-up date</label><input type="date" id="ef-followup" name="followup" value="${esc(val('followup'))}"></div>`}
    <div class="btn-row">
      <button class="primary-btn" type="submit">Save</button>
      <button class="ghost-btn" type="button" data-action="edit-cancel">Cancel</button>
    </div>
  </form>`;
}

function cardHTML(k, r, { draggable = false, showLabel = false } = {}) {
  const L = LISTS[k];
  const isTask = L.kind === 'task';
  const od = !r.completed && isOverdue(k, r);
  const pri = PRI.includes(r.priority) ? r.priority : 'Medium';
  const accent = r.completed ? 'completed' : od ? 'overdue' : pri;
  const editing = state.editing?.k === k && state.editing?.id === r.id;
  const detail = isTask ? (r.notes ? `📝 ${linkify(r.notes)}` : '') : (r.waiting ? `⏳ ${linkify(r.waiting)}` : '');
  const rule = isTask && r.recurring ? parseRecurring(r.recurring_dates).rule : null;
  const label = showLabel || r.completed ? `<span class="list-label ${L.personal ? 'personal' : ''}">${showLabel ? esc(L.label) : (isTask ? 'Task' : 'WTHBF')}</span>` : '';
  const badges = `
      ${od ? '<span class="badge overdue-tag">Overdue</span>' : ''}
      ${isTask && r.category ? `<span class="badge cat-badge">${esc(r.category)}</span>` : ''}
      <span class="badge badge-${pri}">${pri}</span>
      ${!r.completed && isTask && r.reminder ? '<span class="badge reminder-badge" title="Reminder on">⏰</span>' : ''}
      ${!r.completed && isTask && r.recurring ? `<span class="badge recurring-badge" title="${esc(describeRule(rule))}">🔄</span>` : ''}`;
  const buttons = r.completed ? `
      <button class="btn" data-action="restore">↩ Restore</button>
      <button class="btn danger" data-action="delete" title="Delete">✕</button>` : `
      ${isTask ? '<button class="btn warn" data-action="reminder" title="Reminder &amp; recurrence">⏰</button>' : ''}
      <button class="btn warn" data-action="edit" title="Edit" aria-expanded="${editing}">✎</button>
      <button class="btn" data-action="menu" title="More: move, convert, snooze, copy…" aria-haspopup="menu">⋯</button>
      <button class="btn" data-action="complete" title="Mark complete">✓</button>
      <button class="btn danger" data-action="delete" title="Delete">✕</button>`;
  const actions = `<span class="card-badges">${badges}</span><span class="card-buttons">${buttons}</span>`;
  return `<div class="card ${r.completed ? 'completed-card' : ''} ${L.personal ? 'personal-card' : ''}" data-key="${k}" data-id="${r.id}" ${draggable ? 'data-draggable' : ''}>
    <div class="card-accent accent-${accent}"></div>
    <div class="card-inner">
      <div class="card-top">
        <div class="card-title">
          ${draggable ? '<span class="drag-handle" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>' : ''}
          <div>${label}<div class="card-name">${esc(r.name)}</div></div>
        </div>
        <div class="card-actions">${actions}</div>
      </div>
      ${detail ? `<div class="card-detail">${detail}</div>` : ''}
      <div class="card-meta">
        <span>📅 Added ${fmt(r.added) || '—'}</span>
        ${r.completed ? '' : dateMeta(k, r)}
        ${rule || (isTask && r.recurring) ? `<span>🔄 ${esc(describeRule(rule))}</span>` : ''}
        ${r.completed && r.completed_at ? `<span>✓ Completed ${fmt(r.completed_at)}</span>` : ''}
      </div>
      ${editing ? editFormHTML(k, r) : ''}
    </div>
  </div>`;
}

const empty = (icon, msg) => `<div class="empty"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;

function renderActive(k) {
  const { items } = visibleList(k);
  const manual = ui.views[k].sort === 'manual';
  if (!items.length) return query() ? empty('🔍', 'No matches.') : empty('✓', 'All clear!');
  const hint = manual ? '⠿ Drag the handle to reorder, or use ⋯ → Move' : `Sorted by ${ui.views[k].sort === 'due' ? 'date' : 'priority'}. Switch Sort to Manual to reorder.`;
  return `<div class="hint">${hint}</div>` + items.map(r => cardHTML(k, r, { draggable: manual })).join('');
}

function renderCompleted(v) {
  const vs = ui.views[v], q = query();
  const items = VIEWS[v].completed
    .filter(k => vs.filter === 'all' || (vs.filter === 'wthbf') === (LISTS[k].kind === 'wthbf'))
    .flatMap(k => state.rows[k].filter(r => r.completed && matches(r, q)).map(r => ({ k, r })))
    .sort((a, b) => cmpDate(b.r.completed_at, a.r.completed_at) || (b.r.id - a.r.id));
  if (!items.length) return query() ? empty('🔍', 'No matches.') : empty('🏆', 'Nothing completed yet!');
  const shown = items.slice(0, vs.limit);
  return shown.map(({ k, r }) => cardHTML(k, r)).join('')
    + (items.length > shown.length ? `<button class="ghost-btn more-btn" data-action="more">Show ${Math.min(50, items.length - shown.length)} more (${items.length - shown.length} older)</button>` : '');
}

function renderToday() {
  const g = todayGroups();
  const section = (title, list, cls = '') => list.length
    ? `<div class="section-title ${cls}">${title} <span class="n">${list.length}</span></div>` + list.map(({ k, r }) => cardHTML(k, r, { showLabel: true })).join('')
    : '';
  const html = section('⚠️ Overdue', g.overdue, 'overdue') + section('⚑ Due today', g.due) + section('🔔 Follow up today', g.follow);
  return html || (query() ? empty('🔍', 'No matches.') : empty('🎉', `Nothing overdue or due today (${fmt(today())}).`));
}

function chip(field, value, label, cur) {
  return `<button class="chip ${cur === value ? 'active' : ''}" data-action="chip" data-field="${field}" data-value="${esc(value)}">${esc(label)}</button>`;
}

function renderChips() {
  const v = state.view, vs = ui.views[v];
  let html = '';
  if (v === 'today') {
    html = chip('scope', 'all', 'Work + Personal', vs.scope) + chip('scope', 'work', 'Work', vs.scope) + chip('scope', 'personal', 'Personal', vs.scope);
  } else if (VIEWS[v].completed) {
    html = chip('filter', 'all', 'All', vs.filter) + chip('filter', 'wthbf', 'WTHBF', vs.filter) + chip('filter', 'tasks', 'Tasks', vs.filter);
  } else {
    html = ['all', ...PRI, 'overdue'].map(p => chip('filter', p, p === 'all' ? 'All' : p === 'overdue' ? 'Overdue' : p, vs.filter)).join('');
    if (LISTS[v].kind === 'task') {
      const cats = [...catsFor(v)];
      active(v).forEach(r => { if (r.category && !cats.includes(r.category)) cats.push(r.category); });
      html += '<span class="chip-sep"></span>' + chip('cat', 'all', 'All categories', vs.cat) + cats.map(c => chip('cat', c, c, vs.cat)).join('');
      const { hiddenCount } = visibleList(v);
      if (hiddenCount || vs.showUpcoming) {
        html += `<span class="chip-sep"></span><button class="chip ${vs.showUpcoming ? 'active' : ''}" data-action="toggle-upcoming" title="Recurring tasks are hidden until the day before they're due">🔄 ${vs.showUpcoming ? 'Hide' : 'Show'} ${hiddenCount} upcoming recurring</button>`;
      }
    }
  }
  $('#chips').innerHTML = html;
}

function renderHeader() {
  const overdue = allOverdueCount();
  const stats = [
    ['today', dueTodayCount(), 'Today'],
    ['today', overdue, 'Overdue', overdue > 0],
    ['w', active('w').length, 'WTHBF'],
    ['t', visibleCount('t'), 'Tasks'],
    ['pt', active('pw').length + visibleCount('pt'), 'Personal'],
  ];
  $('#header-stats').innerHTML = stats.map(([view, n, label, alert]) =>
    `<button class="stat ${alert ? 'alert' : ''}" data-action="view" data-view="${view}"><div class="stat-num">${state.loaded ? n : '—'}</div><div class="stat-label">${label}</div></button>`).join('');
}

function renderTabs() {
  const n = state.loaded;
  const count = v => {
    if (!n) return '—';
    if (v === 'today') { const g = todayGroups(); return g.overdue.length + g.due.length + g.follow.length; }
    if (VIEWS[v].completed) return VIEWS[v].completed.reduce((s, k) => s + state.rows[k].filter(r => r.completed).length, 0);
    return LISTS[v].kind === 'task' ? visibleCount(v) : active(v).length;
  };
  const tab = (v, personal) => `<button class="tab ${personal ? 'personal' : ''} ${v === 'today' ? 'today' : ''} ${state.view === v ? 'active' : ''}" data-action="view" data-view="${v}" role="tab" aria-selected="${state.view === v}">${VIEWS[v].label} <span class="tab-count ${v === 'today' && n && allOverdueCount() ? 'alert' : ''}">${count(v)}</span></button>`;
  $('#tabs').innerHTML = `
    <div class="tab-group"><div class="tab-group-label">Focus</div><div class="tabs">${tab('today')}</div></div>
    <div class="tab-group"><div class="tab-group-label">Work</div><div class="tabs">${tab('w')}${tab('t')}${tab('wc')}</div></div>
    <div class="tab-group"><div class="tab-group-label personal">Personal</div><div class="tabs">${tab('pw', 1)}${tab('pt', 1)}${tab('pc', 1)}</div></div>`;
}

function captureDraft() {
  const f = document.querySelector('[data-edit-form]');
  if (state.editing && f) state.editDraft = Object.fromEntries([...f.querySelectorAll('[name]')].map(el => [el.name, el.value]));
}

function renderList() {
  captureDraft();
  const el = $('#list'), v = state.view;
  if (!state.loaded) {
    el.innerHTML = state.loadError
      ? `<div class="empty"><div class="empty-icon">⚠️</div><p>Couldn't load your tasks (${esc(state.loadError)}).</p><p><button class="primary-btn" data-action="refresh">Try again</button></p></div>`
      : '<div class="loading">Loading…</div>';
    return;
  }
  if (state.editing && !find(state.editing.k, state.editing.id)) { state.editing = null; state.editDraft = null; }
  el.innerHTML = v === 'today' ? renderToday() : VIEWS[v].completed ? renderCompleted(v) : renderActive(v);
}

function render() {
  const v = state.view;
  document.querySelector('main').classList.toggle('personal-view', isPersonalView(v));
  renderHeader();
  renderTabs();
  if (state.loaded) renderChips(); else $('#chips').innerHTML = '';
  const listView = !!VIEWS[v].list;
  $('#sort-wrap').hidden = !listView;
  if (listView) $('#sort').value = ui.views[v].sort;
  document.querySelectorAll('.add-panel').forEach(p => { p.hidden = p.dataset.key !== v; });
  renderList();
  closeMenu();
}

// ── Add panels (built once, so half-typed entries survive re-renders) ────────
function addPanelHTML(k) {
  const L = LISTS[k], id = f => `add-${k}-${f}`;
  const pri = `<div class="form-col"><label class="form-label" for="${id('pri')}">Priority</label><select id="${id('pri')}" name="priority">${PRI.map(p => opt(p, 'Medium')).join('')}</select></div>`;
  const body = L.kind === 'wthbf' ? `
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="${id('name')}">Contact name<span class="req">*</span></label>
        <div class="input-with-mic"><input type="text" id="${id('name')}" name="name" placeholder="Required">${micBtn(id('name'))}</div></div>
      ${pri}
    </div>
    <div class="form-col"><label class="form-label" for="${id('waiting')}">What I'm waiting on<span class="req">*</span></label>
      <div class="input-with-mic"><input type="text" id="${id('waiting')}" name="waiting" placeholder="Required">${micBtn(id('waiting'))}</div></div>
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="${id('followup')}">Follow-up date</label><input type="date" id="${id('followup')}" name="followup"></div>
      <div class="form-col" style="justify-content:flex-end"><button class="primary-btn" type="submit">Add item</button></div>
    </div>` : `
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="${id('name')}">Task<span class="req">*</span></label>
        <div class="input-with-mic"><input type="text" id="${id('name')}" name="name" placeholder="Required">${micBtn(id('name'))}</div></div>
      ${pri}
    </div>
    <div class="form-grid-2">
      <div class="form-col"><label class="form-label" for="${id('cat')}">Category</label><select id="${id('cat')}" name="category" data-cat-select="${k}"></select></div>
      <div class="form-col"><label class="form-label" for="${id('due')}">Due date</label><input type="date" id="${id('due')}" name="due"></div>
    </div>
    <div class="form-col"><label class="form-label" for="${id('notes')}">Notes (optional)</label>
      <div class="input-with-mic"><input type="text" id="${id('notes')}" name="notes" placeholder="Any context">${micBtn(id('notes'))}</div></div>
    <div class="btn-row">
      <button class="primary-btn" type="submit">Add task</button>
      ${k === 't' ? '<button class="dashed-btn" type="button" data-action="cat-toggle">＋ Manage categories</button>' : ''}
    </div>
    ${k === 't' ? `<div class="cat-manager" id="cat-manager" hidden>
      <input type="text" id="new-cat-input" placeholder="New category name">
      <button class="primary-btn" type="button" data-action="cat-add">Add category</button>
      <div id="cat-tags" class="btn-row"></div></div>` : ''}`;
  return `<form class="add-panel" data-key="${k}" data-add-form="${k}" hidden novalidate>
    <div class="add-panel-title">＋ Add ${L.kind === 'wthbf' ? (L.personal ? 'Personal WTHBF' : 'WTHBF item') : (L.personal ? 'Personal Task' : 'task')}</div>${body}</form>`;
}

function renderCatControls() {
  document.querySelectorAll('[data-cat-select]').forEach(sel => {
    const k = sel.dataset.catSelect, cur = sel.value;
    const cats = catsFor(k);
    sel.innerHTML = cats.map(c => opt(c, cur || (k === 't' ? (cats.includes('Work') ? 'Work' : cats[0]) : 'Personal'))).join('');
  });
  const tags = $('#cat-tags');
  if (tags) tags.innerHTML = state.cats.map(c => `<span class="cat-tag">${esc(c)}<button type="button" data-action="cat-del" data-cat="${esc(c)}" title="Remove category">✕</button></span>`).join('');
}

async function addCategory() {
  const input = $('#new-cat-input');
  const name = input.value.trim();
  if (!name || state.cats.includes(name)) { input.classList.toggle('required-empty', !name); return; }
  begin();
  try {
    const saved = await api.addCategory(name);
    state.cats.push(saved.name); state.cats.sort((a, b) => a.localeCompare(b));
    input.value = ''; end(); renderCatControls(); render();
  } catch (e) { end(true); toast(`Couldn't add category: ${e.message}`, { type: 'error' }); }
}

async function removeCategory(name) {
  if (!confirm(`Remove the category “${name}”? Existing tasks keep their label.`)) return;
  const before = [...state.cats];
  state.cats = state.cats.filter(c => c !== name);
  renderCatControls(); render(); begin();
  try { await api.removeCategory(name); end(); }
  catch (e) { state.cats = before; end(true); renderCatControls(); render(); toast(`Couldn't remove category: ${e.message}`, { type: 'error' }); }
}

// ── Popover menu ─────────────────────────────────────────────────────────────
function openMenu(btn, k, id) {
  const r = find(k, id);
  if (!r) return;
  const menu = $('#menu');
  if (state.menu && state.menu.id === id && !menu.hidden) { closeMenu(); return; }
  state.menu = { k, id };
  const item = (act, label, disabled = false, cls = '') => `<button type="button" role="menuitem" data-menu="${act}" ${disabled ? 'disabled' : ''} class="${cls}">${label}</button>`;
  let html = '';
  if (state.view === k && ui.views[k].sort === 'manual') {
    const vis = visibleList(k).items, i = vis.findIndex(x => x.id === id), all = active(k);
    html += `<div class="menu-label">Move</div>${item('up', '▲ Up one', i <= 0)}${item('down', '▼ Down one', i < 0 || i >= vis.length - 1)}`
      + `${item('top', '⤒ Move to top', all[0]?.id === id)}${item('bottom', '⤓ Move to bottom', all[all.length - 1]?.id === id)}${item('pos', '# Move to position…')}<hr>`;
  }
  html += `<div class="menu-label">${LISTS[k].kind === 'task' ? 'Due date' : 'Follow-up date'}</div>${item('snooze:1', '💤 Tomorrow')}${item('snooze:3', '💤 In 3 days')}${item('snooze:7', '💤 In 1 week')}${item('snooze:mon', '💤 Next Monday')}<hr>`;
  html += `<div class="menu-label">Move to list</div>` + KEYS.filter(k2 => k2 !== k).map(k2 => item(`convert:${k2}`, `→ ${LISTS[k2].label}`)).join('');
  html += '<hr>';
  if (k === 't') html += item('copy', '⧉ Copy to other categories…');
  if (LISTS[k].kind === 'task') html += item('reminder', '⏰ Reminder &amp; recurrence…');
  html += item('sprint', '⚡ Add to sprint planner') + '<hr>' + item('delete', '✕ Delete', false, 'danger');
  menu.innerHTML = html;
  menu.hidden = false;
  const b = btn.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = b.right - mw + window.scrollX;
  left = Math.max(8 + window.scrollX, Math.min(left, window.scrollX + document.documentElement.clientWidth - mw - 8));
  let top = b.bottom + 4 + window.scrollY;
  if (b.bottom + mh + 8 > window.innerHeight && b.top - mh - 4 > 0) top = b.top - mh - 4 + window.scrollY;
  menu.style.left = `${left}px`; menu.style.top = `${top}px`;
  menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
function closeMenu() { const m = $('#menu'); if (m && !m.hidden) { m.hidden = true; state.menu = null; } }

function runMenu(act) {
  const { k, id } = state.menu || {};
  closeMenu();
  if (!k) return;
  const [name, arg] = act.split(':');
  if (['up', 'down', 'top', 'bottom'].includes(name)) moveOp(k, id, name);
  else if (name === 'pos') openPosModal(k, id);
  else if (name === 'snooze') snooze(k, id, arg);
  else if (name === 'convert') convert(k, id, arg);
  else if (name === 'copy') openReplicate(id);
  else if (name === 'reminder') openReminder(k, id);
  else if (name === 'sprint') sprintAddTask(find(k, id).name);
  else if (name === 'delete') deleteWithUndo(k, id);
}

// ── Modals ───────────────────────────────────────────────────────────────────
let modalCtx = null;
const openModal = (id, ctx) => { modalCtx = ctx; $(`#${id}`).classList.add('open'); };
const closeModals = () => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); modalCtx = null; };

function openReminder(k, id) {
  const r = find(k, id);
  if (!r) return;
  const { rule } = parseRecurring(r.recurring_dates);
  $('#rm-task-name').textContent = r.name;
  $('#rm-reminder-on').checked = !!r.reminder;
  $('#rm-recurring').checked = !!r.recurring;
  $('#rm-dates-section').hidden = !r.recurring;
  const pattern = rule?.pattern || 'monthly_day';
  document.querySelector(`input[name="rm-pattern"][value="${pattern}"]`).checked = true;
  $('#rm-day-of-month').value = rule?.day || (r.due ? +r.due.slice(8, 10) : 1);
  $('#rm-x-days').value = rule?.days || 7;
  $('#rm-weekday').value = rule?.weekday ?? 1;
  $('#rm-start-date').value = rule?.start || today();
  $('#rm-end-date').value = rule?.end || '';
  updateRulePreview();
  openModal('reminder-modal', { k, id });
}
function readRule() {
  const pattern = document.querySelector('input[name="rm-pattern"]:checked')?.value || 'monthly_day';
  const rule = { pattern, start: $('#rm-start-date').value || today(), end: $('#rm-end-date').value || '' };
  if (pattern === 'monthly_day') rule.day = parseInt($('#rm-day-of-month').value) || 1;
  if (pattern === 'every_x_days') rule.days = parseInt($('#rm-x-days').value) || 7;
  if (pattern === 'weekly') rule.weekday = parseInt($('#rm-weekday').value) || 0;
  return rule;
}
function updateRulePreview() {
  const p = $('#rm-preview');
  const dates = generateDates(readRule());
  if (!dates.length) { p.textContent = 'No dates generated. Check your start/end dates.'; return; }
  p.innerHTML = `<strong>${dates.length} dates:</strong> ${dates.slice(0, 5).map(fmt).join(', ')}${dates.length > 5 ? ` … through ${fmt(dates[dates.length - 1])}` : ''}`;
}
async function saveReminder() {
  const { k, id } = modalCtx || {};
  const r = k && find(k, id);
  if (!r) return closeModals();
  const reminder = $('#rm-reminder-on').checked, recurring = $('#rm-recurring').checked;
  const patch = { reminder, recurring, recurring_dates: '[]', reminder_sent: false };
  if (recurring) {
    const rule = readRule(), dates = generateDates(rule);
    if (!dates.length) { updateRulePreview(); return; }
    patch.recurring_dates = JSON.stringify({ pattern: rule, dates });
    if (!r.due) patch.due = dates.find(d => d >= today()) || dates[0];
  }
  if (reminder) requestNotificationPermission();
  closeModals();
  updateRow(k, id, patch, 'save reminder settings');
}

function openPosModal(k, id) {
  const vis = visibleList(k).items;
  $('#pos-name').textContent = find(k, id)?.name || '';
  $('#pos-input').value = vis.findIndex(r => r.id === id) + 1;
  $('#pos-input').max = vis.length;
  $('#pos-max').textContent = `of ${vis.length}`;
  openModal('position-modal', { k, id });
  $('#pos-input').select();
}
function savePos() {
  const { k, id } = modalCtx || {};
  closeModals();
  if (!k) return;
  const vis = visibleList(k).items;
  const to = parseInt($('#pos-input').value) - 1, from = vis.findIndex(r => r.id === id);
  if (isNaN(to) || to < 0 || to >= vis.length || from < 0 || to === from) return;
  moveRelative(k, id, vis[to].id, to > from);
}

function openReplicate(id) {
  const r = find('t', id);
  if (!r) return;
  $('#rep-preview').textContent = r.name + (r.notes ? ` — ${r.notes}` : '');
  const avail = state.cats.filter(c => c !== r.category);
  $('#rep-cats').innerHTML = avail.length
    ? avail.map(c => `<button type="button" class="rep-cat-btn" data-action="rep-toggle" data-cat="${esc(c)}">${esc(c)}</button>`).join('')
    : '<span class="hint">No other categories. Add more via Manage categories.</span>';
  $('#rep-confirm').disabled = true;
  openModal('replicate-modal', { id, selected: new Set() });
}
async function saveReplicate() {
  const { id, selected } = modalCtx || {};
  const r = id && find('t', id);
  if (!r || !selected.size) return;
  closeModals();
  let order = nextOrder('t');
  const rows = [...selected].map(cat => ({ name: r.name, notes: r.notes ?? null, priority: r.priority, category: cat, due: r.due ?? null, added: today(), sort_order: order++ }));
  const saved = await insertRows('t', rows, 'copy the task');
  if (saved) toast(`Copied to ${saved.length} categor${saved.length > 1 ? 'ies' : 'y'}`);
}

// ── Editing ──────────────────────────────────────────────────────────────────
function startEdit(k, id) {
  const same = state.editing?.k === k && state.editing?.id === id;
  state.editing = same ? null : { k, id };
  state.editDraft = null;
  renderList();
  if (!same) $('#ef-name')?.focus();
}
async function saveEdit(form) {
  const { k, id } = state.editing || {};
  const r = k && find(k, id);
  if (!r) return;
  const g = n => form.elements[n];
  const name = g('name').value.trim();
  const required = [g('name')];
  const patch = { name, priority: g('priority').value };
  if (LISTS[k].kind === 'wthbf') {
    patch.waiting = g('waiting').value.trim();
    patch.followup = g('followup').value || null;
    required.push(g('waiting'));
  } else {
    patch.category = g('category').value;
    patch.due = g('due').value || null;
    patch.notes = g('notes').value.trim() || null;
    if (patch.due !== r.due) patch.reminder_sent = false;
  }
  const missing = required.filter(el => !el.value.trim());
  required.forEach(el => el.classList.toggle('required-empty', !el.value.trim()));
  if (missing.length) { missing[0].focus(); return; }
  const draft = Object.fromEntries([...form.querySelectorAll('[name]')].map(el => [el.name, el.value]));
  state.editing = null; state.editDraft = null;
  if (!(await updateRow(k, id, patch, 'save your changes'))) {
    state.editing = { k, id }; state.editDraft = draft; renderList(); // reopen with what she typed
  }
}

// ── Views, theme ─────────────────────────────────────────────────────────────
function setView(v) {
  if (!VIEWS[v]) return;
  state.view = v; state.editing = null; state.editDraft = null;
  localStorage.setItem(VIEW_KEY, v);
  history.replaceState(null, '', `#${v}`);
  render();
}

const THEMES = ['auto', 'dark', 'light'];
function applyTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  $('#theme-btn').textContent = t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🌓';
  $('#theme-btn').title = `Theme: ${t} (click to change)`;
}
function cycleTheme() {
  const cur = localStorage.getItem('tracker-theme') || 'auto';
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  if (next === 'auto') localStorage.removeItem('tracker-theme'); else localStorage.setItem('tracker-theme', next);
  applyTheme(next);
}

// ── Data loading ─────────────────────────────────────────────────────────────
let loading = false;
async function load(manual = false) {
  if (loading) return;
  loading = true;
  setSync('syncing', state.loaded ? 'Refreshing…' : 'Loading…');
  try {
    const [w, t, c, pw, pt] = await Promise.all([api.list('wthbf'), api.list('tasks'), api.categories(), api.list('personal_wthbf'), api.list('personal_tasks')]);
    const keep = (k, rows) => (Array.isArray(rows) ? rows : []).filter(r => !pendingDeletes.has(`${k}:${r.id}`));
    state.rows = { w: keep('w', w), t: keep('t', t), pw: keep('pw', pw), pt: keep('pt', pt) };
    state.cats = Array.isArray(c) && c.length ? c.map(x => x.name) : ['Personal', 'Home', 'Work'];
    state.loaded = true; state.loadError = null; state.lastLoad = Date.now(); state.day = today();
    setSync(pending ? 'syncing' : 'ok', pending ? undefined : 'Synced ✓');
    renderCatControls();
    render();
    if (manual) toast('Up to date');
    runReminders();
  } catch (e) {
    console.error(e);
    state.loadError = e.message;
    setSync('error', 'Sync error (click to retry)');
    if (state.loaded) toast(`Couldn't refresh: ${e.message}`, { type: 'error' }); else render();
  } finally { loading = false; }
}

function runReminders() {
  if (!state.loaded) return;
  const tasks = [
    ...state.rows.t.map(row => ({ row, table: 'tasks', personal: false })),
    ...state.rows.pt.map(row => ({ row, table: 'personal_tasks', personal: true })),
  ];
  checkReminders(tasks).then(() => renderHeader());
}

// ── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  document.addEventListener('click', e => {
    const menuBtn = e.target.closest('[data-menu]');
    if (menuBtn) { runMenu(menuBtn.dataset.menu); return; }
    if (!e.target.closest('#menu, [data-action="menu"]')) closeMenu();
    if (e.target.classList.contains('modal-overlay')) { closeModals(); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const card = el.closest('.card');
    const k = card?.dataset.key, id = card ? Number(card.dataset.id) : null;
    switch (el.dataset.action) {
      case 'view': setView(el.dataset.view); break;
      case 'refresh': load(true); break;
      case 'theme': cycleTheme(); break;
      case 'mic': startMic(el); break;
      case 'chip': {
        const vs = ui.views[state.view];
        vs[el.dataset.field] = el.dataset.value;
        render(); break;
      }
      case 'toggle-upcoming': ui.views[state.view].showUpcoming = !ui.views[state.view].showUpcoming; render(); break;
      case 'more': ui.views[state.view].limit += 50; renderList(); break;
      case 'edit': startEdit(k, id); break;
      case 'edit-cancel': state.editing = null; state.editDraft = null; renderList(); break;
      case 'complete': complete(k, id); break;
      case 'restore': restore(k, id); break;
      case 'delete': deleteWithUndo(k, id); break;
      case 'reminder': openReminder(k, id); break;
      case 'menu': e.stopPropagation(); openMenu(el, k, id); break;
      case 'cat-toggle': { const m = $('#cat-manager'); m.hidden = !m.hidden; renderCatControls(); if (!m.hidden) $('#new-cat-input').focus(); break; }
      case 'cat-add': addCategory(); break;
      case 'cat-del': removeCategory(el.dataset.cat); break;
      case 'modal-close': closeModals(); break;
      case 'rm-save': saveReminder(); break;
      case 'pos-save': savePos(); break;
      case 'rep-toggle': {
        const c = el.dataset.cat, s = modalCtx.selected;
        if (s.has(c)) s.delete(c); else s.add(c);
        el.classList.toggle('selected', s.has(c));
        $('#rep-confirm').disabled = !s.size; break;
      }
      case 'rep-save': saveReplicate(); break;
    }
  });

  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.dataset.addForm) { e.preventDefault(); addItem(f.dataset.addForm, f); }
    else if ('editForm' in f.dataset) { e.preventDefault(); saveEdit(f); }
  });

  document.addEventListener('input', e => {
    if (e.target.classList.contains('required-empty') && e.target.value.trim()) e.target.classList.remove('required-empty');
    if (e.target.closest('#reminder-modal')) updateRulePreview();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rm-recurring') $('#rm-dates-section').hidden = !e.target.checked;
    if (e.target.closest('#reminder-modal')) updateRulePreview();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#menu').hidden) closeMenu();
      else if (document.querySelector('.modal-overlay.open')) closeModals();
      else if (state.editing) { state.editing = null; state.editDraft = null; renderList(); }
    } else if (e.key === 'Enter' && e.target.id === 'new-cat-input') { e.preventDefault(); addCategory(); }
    else if (e.key === 'Enter' && e.target.id === 'pos-input') { e.preventDefault(); savePos(); }
    else if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); $('#search').focus(); }
  });

  let searchTimer;
  $('#search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { ui.search = e.target.value; renderChips(); renderList(); renderTabs(); }, 120);
  });
  $('#sort').addEventListener('change', e => { ui.views[state.view].sort = e.target.value; saveUi(); render(); });

  window.addEventListener('resize', closeMenu);

  makeSortable($('#list'), {
    itemSel: '.card[data-draggable]', handleSel: '.drag-handle', groupAttr: 'data-key',
    onDrop: (from, to, after, item) => moveRelative(item.dataset.key, Number(from), Number(to), after),
  });

  // Keep in sync with changes made on other devices, and roll over at midnight.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDeletes();
    else if (Date.now() - state.lastLoad > 60_000 && !pending) load();
  });
  window.addEventListener('pagehide', flushDeletes);
  setInterval(() => {
    if (today() !== state.day) { state.day = today(); render(); runReminders(); }
    if (document.visibilityState === 'visible' && Date.now() - state.lastLoad > 10 * 60_000 && !pending) load();
  }, 60_000);
}

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  applyTheme(localStorage.getItem('tracker-theme') || 'auto');
  const fromHash = location.hash.slice(1);
  state.view = VIEWS[fromHash] ? fromHash : (VIEWS[localStorage.getItem(VIEW_KEY)] ? localStorage.getItem(VIEW_KEY) : 'today');
  $('#add-panels').innerHTML = ['w', 't', 'pw', 'pt'].map(addPanelHTML).join('');
  initQuickLinks();
  initSprint();
  bindEvents();
  renderCatControls();
  render();
  load();
  requestNotificationPermission();
}

init();

// Small hook for automated tests / debugging in the console.
window.__tracker = { state, ui, render, load };
