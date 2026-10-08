// Sprint planner + timer. State lives in localStorage['sprintPlannerState'] with the
// same shape as the original page, so sprint-timer.html keeps working.
import { $, esc, toast, micBtn } from './ui.js';
import { makeSortable } from './drag.js';

const SP_KEY = 'sprintPlannerState';
const COLLAPSE_KEY = 'sprintPlannerCollapsed';
const DURATIONS = [15, 20, 25, 30, 45, 60];
const BREAKS = [0, 5, 10, 15, 20];

let st = { tasks: [], blocks: [], currentIdx: 0, running: false, sprintEndTime: null, spTotalSeconds: 0, pausedSecondsLeft: null, secondsLeft: 0 };
let view = 'setup';
let editIdx = null;
let secondsLeft = 0;
let interval = null;
const savedCollapse = localStorage.getItem(COLLAPSE_KEY);
// Open by default on desktop (as before); collapsed by default on phones to save space.
let collapsed = savedCollapse === null ? window.matchMedia('(max-width: 640px)').matches : savedCollapse === '1';

const save = () => { st.secondsLeft = secondsLeft; localStorage.setItem(SP_KEY, JSON.stringify(st)); };
const timeStr = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const sprintCount = () => st.blocks.filter(b => b.type === 'sprint').length;
const sprintNumAt = i => st.blocks.slice(0, i + 1).filter(b => b.type === 'sprint').length;
const paused = () => st.pausedSecondsLeft != null;

function blockRows(blocks, startTime, startIdx = 0, withMove = false) {
  const cursor = new Date(startTime);
  const sprintIdx = st.blocks.map((b, i) => (b.type === 'sprint' ? i : -1)).filter(i => i >= 0);
  const html = blocks.map((b, k) => {
    const i = startIdx + k;
    const t = timeStr(cursor);
    b.time = t;
    cursor.setMinutes(cursor.getMinutes() + (parseInt(b.durationMins) || 0));
    const isSprint = b.type === 'sprint';
    const pos = sprintIdx.indexOf(i);
    return `<div class="sp-block ${isSprint ? 'sprint' : 'break'}">
      <span class="sp-block-time">${t}</span>
      <span class="sp-block-label">${isSprint ? `Sprint ${sprintNumAt(i)}/${sprintCount()}` : 'Break'}</span>
      <span class="sp-block-task">${esc(b.task)}</span>
      <span class="hint" style="margin:0">${b.durationMins}m</span>
      ${withMove && isSprint ? `<button class="btn" data-sp="move" data-i="${i}" data-dir="-1" ${pos === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn" data-sp="move" data-i="${i}" data-dir="1" ${pos === sprintIdx.length - 1 ? 'disabled' : ''}>▼</button>` : ''}
    </div>`;
  }).join('');
  return { html, end: timeStr(cursor) };
}

function renderSetup() {
  const opts = (vals, cur, f) => vals.map(v => `<option value="${v}" ${+cur === v ? 'selected' : ''}>${f(v)}</option>`).join('');
  const rows = st.tasks.map((t, i) => editIdx === i ? `
    <div class="sp-row" data-id="${i}">
      <input type="text" id="sp-edit-name" value="${esc(t.name)}" style="flex:1;min-width:160px">
      <select id="sp-edit-mins">${opts(DURATIONS, t.mins, v => `${v} min`)}</select>
      <button class="primary-btn" data-sp="edit-save" data-i="${i}">Save</button>
      <button class="ghost-btn" data-sp="edit-cancel">Cancel</button>
    </div>` : `
    <div class="sp-row" data-id="${i}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="sp-name">${esc(t.name)}</span>
      <span class="sp-mins">${t.mins}m</span>
      ${i < st.tasks.length - 1
        ? `<span class="hint" style="margin:0">then</span><select data-sp-break="${i}" aria-label="Break after">${opts(BREAKS, t.breakAfter || 0, v => (v ? `${v}m break` : 'no break'))}</select>`
        : '<span class="hint" style="margin:0">last sprint</span>'}
      <button class="icon-btn" data-sp="edit" data-i="${i}" title="Edit">✏️</button>
      <button class="icon-btn" data-sp="remove" data-i="${i}" title="Remove">✕</button>
    </div>`).join('');
  return `
    <form class="sp-add" data-sp-form>
      <div class="form-col" style="flex:1;min-width:200px">
        <label class="sp-label" for="sp-task-input">Task name</label>
        <div class="input-with-mic"><input type="text" id="sp-task-input" placeholder="e.g. Market Reports ×5" autocomplete="off">${micBtn('sp-task-input')}</div>
      </div>
      <div class="form-col">
        <label class="sp-label" for="sp-task-duration">Sprint time</label>
        <select id="sp-task-duration">${opts(DURATIONS, 25, v => `${v} min`)}</select>
      </div>
      <button class="primary-btn" type="submit">＋ Add Sprint</button>
    </form>
    <div class="sp-label" style="margin-bottom:8px">Your sprints — drag to reorder</div>
    <div id="sp-list">${rows || '<div class="hint">No sprints yet — add one above, or use “⚡ Add to sprint planner” on any task.</div>'}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="primary-btn" data-sp="build">▶ Build Schedule</button>
      <button class="ghost-btn" data-sp="clear">Clear All</button>
    </div>`;
}

function renderSchedule() {
  const now = new Date(); now.setSeconds(0, 0);
  const { html, end } = blockRows(st.blocks, now, 0, true);
  return `${html}<div class="sp-done-by">🏁 Done by ${end}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="primary-btn" data-sp="start">▶ Start First Sprint</button>
      <button class="ghost-btn" data-sp="reset">↩ Edit Plan</button>
    </div>`;
}

function renderRunning() {
  const b = st.blocks[st.currentIdx];
  const next = st.blocks[st.currentIdx + 1];
  const start = new Date(Date.now() + secondsLeft * 1000);
  const { html } = blockRows(st.blocks.slice(st.currentIdx + 1), start, st.currentIdx + 1);
  return `<div class="sp-current">
      <div class="sp-current-label">${b.type === 'break' ? '☕ Break' : `Sprint ${sprintNumAt(st.currentIdx)} of ${sprintCount()}`}</div>
      <div class="sp-current-task">${esc(b.task)}</div>
      <div class="sp-timer" id="sp-timer">${mmss(secondsLeft)}</div>
      <input type="range" class="sp-slider" id="sp-slider" min="0" max="100" step="0.5" value="0" aria-label="Sprint progress">
    </div>
    <div class="hint"><span class="sp-label">Up next:</span> ${next ? `${esc(next.task)} (${next.durationMins}m)` : '🎉 That’s your last one!'}</div>
    <div class="sp-actions">
      <button class="primary-btn" data-sp="pause">${paused() ? '▶ Resume' : '⏸ Pause'}</button>
      <button class="ghost-btn" data-sp="skip">Skip →</button>
      <button class="ghost-btn" data-sp="reset">↩ Edit Plan</button>
    </div>
    <div style="margin-top:12px">${html}</div>`;
}

function render() {
  const root = $('#sprint-planner');
  const b = st.blocks[st.currentIdx];
  const status = view === 'running' && b ? `${paused() ? '⏸ ' : ''}${esc(b.task)} · <span id="sp-head-timer">${mmss(secondsLeft)}</span>`
    : view === 'schedule' ? `${sprintCount()} sprints planned` : st.tasks.length ? `${st.tasks.length} sprint${st.tasks.length > 1 ? 's' : ''} ready` : '';
  const body = collapsed ? '' : view === 'running' ? renderRunning() : view === 'schedule' ? renderSchedule()
    : view === 'done' ? `<div class="sp-current"><div class="sp-current-label">🎉 All Done!</div><div class="sp-current-task">Great work today, Janet!</div></div>
      <div class="sp-actions"><button class="ghost-btn" data-sp="reset">↩ Edit Plan</button><button class="ghost-btn" data-sp="clear">Clear All</button></div>`
    : renderSetup();
  root.innerHTML = `<button class="sp-header" data-sp="toggle" aria-expanded="${!collapsed}">
      <span>⚡ Sprint Planner</span><span class="sp-status">${status}</span><span class="sp-arrow">${collapsed ? '▼' : '▲'}</span></button>
    ${collapsed ? '' : `<div class="sp-body">${body}</div>`}`;
  updateTimer();
}

function updateTimer() {
  const t = $('#sp-timer'); if (t) t.textContent = mmss(secondsLeft);
  const h = $('#sp-head-timer'); if (h) h.textContent = mmss(secondsLeft);
  const s = $('#sp-slider');
  if (s && document.activeElement !== s) {
    const pct = st.spTotalSeconds ? Math.min(100, (st.spTotalSeconds - secondsLeft) / st.spTotalSeconds * 100) : 0;
    s.value = pct;
  }
}

function chime() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 520;
    g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* audio unavailable */ }
}

function tick() {
  clearInterval(interval);
  interval = setInterval(() => {
    if (paused()) return;
    secondsLeft = Math.max(0, Math.round((st.sprintEndTime - Date.now()) / 1000));
    updateTimer();
    if (secondsLeft <= 0) advance(true);
  }, 500);
}

function startBlock() {
  if (st.currentIdx >= st.blocks.length) return allDone();
  const b = st.blocks[st.currentIdx];
  st.spTotalSeconds = b.durationMins * 60;
  secondsLeft = st.spTotalSeconds;
  st.sprintEndTime = Date.now() + secondsLeft * 1000;
  st.pausedSecondsLeft = null;
  st.running = true;
  view = 'running';
  save(); render(); tick();
}

function advance(notify) {
  clearInterval(interval);
  const done = st.blocks[st.currentIdx];
  st.currentIdx++;
  if (st.currentIdx >= st.blocks.length) return allDone();
  const next = st.blocks[st.currentIdx];
  if (notify) {
    if ('Notification' in window && Notification.permission === 'granted' && done) {
      try {
        new Notification(done.type === 'break' ? '☕ Break over' : `✅ Sprint done: ${done.task}`,
          { body: next.type === 'break' ? `☕ Break time! (${next.durationMins} min)` : `Up next: ${next.task}` });
      } catch { /* notifications unavailable */ }
    }
    chime();
  }
  startBlock();
}

function allDone() {
  clearInterval(interval);
  st.running = false; st.pausedSecondsLeft = null;
  view = 'done'; save(); render();
}

function build() {
  if (!st.tasks.length) { toast('Add at least one sprint first.'); return; }
  st.blocks = [];
  st.tasks.forEach((t, i) => {
    st.blocks.push({ type: 'sprint', time: '', task: t.name, durationMins: t.mins });
    if ((t.breakAfter || 0) > 0 && i < st.tasks.length - 1)
      st.blocks.push({ type: 'break', time: '', task: `☕ ${t.breakAfter}-min break`, durationMins: t.breakAfter });
  });
  st.currentIdx = 0; st.running = false; st.pausedSecondsLeft = null;
  view = 'schedule'; save(); render();
}

function moveChunk(idx, dir) {
  const chunks = () => st.blocks.map((b, i) => (b.type === 'sprint' ? { start: i, len: st.blocks[i + 1]?.type === 'break' ? 2 : 1 } : null)).filter(Boolean);
  const cs = chunks();
  const ci = cs.findIndex(c => c.start === idx);
  const ti = ci + dir;
  if (ci < 0 || ti < 0 || ti >= cs.length) return;
  const chunk = st.blocks.splice(cs[ci].start, cs[ci].len);
  const cs2 = chunks();
  st.blocks.splice(cs2[ti] ? cs2[ti].start : st.blocks.length, 0, ...chunk);
  save(); render();
}

function reset() {
  clearInterval(interval);
  st.blocks = []; st.currentIdx = 0; st.running = false; st.pausedSecondsLeft = null;
  view = 'setup'; save(); render();
}

export function sprintAddTask(name, mins = 25) {
  st.tasks.push({ name, mins });
  collapsed = false; localStorage.setItem(COLLAPSE_KEY, '0');
  save(); render();
  toast(view === 'setup' ? `Added “${name}” to the sprint planner` : `Added “${name}” to your sprint list (use Edit Plan to rebuild the schedule)`);
}

export function initSprint() {
  try { Object.assign(st, JSON.parse(localStorage.getItem(SP_KEY) || '{}')); } catch { /* corrupt state */ }
  if (!Array.isArray(st.tasks)) st.tasks = [];
  if (!Array.isArray(st.blocks)) st.blocks = [];
  if (st.blocks.length && st.running && st.currentIdx < st.blocks.length) {
    st.spTotalSeconds = st.spTotalSeconds || st.blocks[st.currentIdx].durationMins * 60;
    view = 'running';
    if (paused()) secondsLeft = st.pausedSecondsLeft;
    else {
      secondsLeft = Math.max(0, Math.round((st.sprintEndTime - Date.now()) / 1000));
      if (secondsLeft <= 0) { advance(false); return bind(); }
      tick();
    }
  } else if (st.blocks.length) view = 'schedule';
  render();
  bind();
}

function bind() {
  const root = $('#sprint-planner');
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-sp]'); if (!el) return;
    const i = +el.dataset.i;
    switch (el.dataset.sp) {
      case 'toggle': collapsed = !collapsed; localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); render(); break;
      case 'remove': st.tasks.splice(i, 1); save(); render(); break;
      case 'edit': editIdx = i; render(); $('#sp-edit-name')?.focus(); break;
      case 'edit-cancel': editIdx = null; render(); break;
      case 'edit-save': {
        const name = $('#sp-edit-name').value.trim(); if (!name) return;
        st.tasks[i].name = name; st.tasks[i].mins = +$('#sp-edit-mins').value; editIdx = null; save(); render(); break;
      }
      case 'build': build(); break;
      case 'clear': clearInterval(interval); st = { tasks: [], blocks: [], currentIdx: 0, running: false, pausedSecondsLeft: null, secondsLeft: 0 }; localStorage.removeItem(SP_KEY); view = 'setup'; render(); break;
      case 'move': moveChunk(i, +el.dataset.dir); break;
      case 'start': st.currentIdx = 0; startBlock(); break;
      case 'reset': reset(); break;
      case 'skip': advance(false); break;
      case 'pause':
        if (paused()) { st.sprintEndTime = Date.now() + secondsLeft * 1000; st.pausedSecondsLeft = null; }
        else st.pausedSecondsLeft = secondsLeft;
        save(); render(); break;
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#sp-task-input'); const name = input.value.trim(); if (!name) return;
    st.tasks.push({ name, mins: +$('#sp-task-duration').value });
    save(); render(); $('#sp-task-input').focus();
  });
  root.addEventListener('change', e => {
    if (e.target.dataset.spBreak !== undefined) { st.tasks[+e.target.dataset.spBreak].breakAfter = +e.target.value; save(); }
  });
  root.addEventListener('input', e => {
    if (e.target.id !== 'sp-slider') return;
    secondsLeft = Math.round(st.spTotalSeconds * (1 - parseFloat(e.target.value) / 100));
    if (paused()) st.pausedSecondsLeft = secondsLeft; else st.sprintEndTime = Date.now() + secondsLeft * 1000;
    save(); updateTimer();
  });
  root.addEventListener('keydown', e => {
    if (e.target.id === 'sp-edit-name' && e.key === 'Enter') root.querySelector('[data-sp="edit-save"]').click();
    if (e.target.id === 'sp-edit-name' && e.key === 'Escape') { editIdx = null; render(); }
  });
  makeSortable(root, {
    itemSel: '.sp-row', handleSel: '.drag-handle',
    onDrop(from, to, after) {
      from = +from; to = +to;
      const [moved] = st.tasks.splice(from, 1);
      let idx = to > from ? to - 1 : to;
      if (after) idx++;
      st.tasks.splice(idx, 0, moved); save(); render();
    },
  });
}
