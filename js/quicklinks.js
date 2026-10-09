// Quick links bar. Editable URLs are stored in localStorage under the same keys as
// the original page ('newsletter-tracker-url', 'nl-submission-url').
import { $, esc } from './ui.js';

const CC_SCRIPT_URL = ''; // Apps Script Web App URL for the CC Responses badge (not configured)
const CC_SEEN_KEY = 'cc_last_seen_count';

const LINKS = [
  { id: 'newsletter', label: '📋 Newsletter Tracker', key: 'newsletter-tracker-url',
    url: 'https://docs.google.com/spreadsheets/d/1HTNv-Qd3aMbmKY9VJs3eFPJL0iadFItPdUqx0sjIRSc/edit?gid=1420608459#gid=1420608459',
    placeholder: 'Paste new Google Sheets URL…' },
  { id: 'nl', label: '📝 NL Submission Form', key: 'nl-submission-url',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSf_8BLsH2GVnnbL5uG45g3ttBwZP3ZKhlHtLG8W_6dYATAxdw/viewform',
    placeholder: 'Paste new NL Submission Form URL…' },
  { id: 'cc', label: '💳 CC Responses', badge: true,
    url: 'https://docs.google.com/spreadsheets/d/100EHGl84dbSJLJxdjc7MaE77xIopL47z_CqV7tScxKA/edit?gid=22132404#gid=22132404' },
  { id: 'ccform', label: '📝 Credit Card Form',
    url: 'https://docs.google.com/forms/d/1KnvHpGa5nR8UKjJs0COLwp1_LjO4OFX5N8foTTQYHDY/edit' },
];

const safeUrl = u => (/^https?:\/\//i.test(u) ? u : '#');
let editing = null;

function render() {
  const bar = $('#quick-links');
  bar.innerHTML = `<span class="quick-links-label">🔗 Quick Links</span>` + LINKS.map(l => {
    const url = (l.key && localStorage.getItem(l.key)) || l.url;
    if (editing === l.id) {
      return `<form class="ql-form" data-ql="${l.id}">
        <input type="url" id="ql-input" value="${esc(url)}" placeholder="${esc(l.placeholder)}" required>
        <button class="primary-btn" type="submit">Save</button>
        ${localStorage.getItem(l.key) ? `<button class="ghost-btn" type="button" data-ql-reset="${l.id}">Reset</button>` : ''}
        <button class="ghost-btn" type="button" data-ql-cancel>Cancel</button></form>`;
    }
    return `<span class="ql"><a class="quick-link" href="${esc(safeUrl(url))}" target="_blank" rel="noopener" ${l.badge ? 'data-ql-cc' : ''}>${l.label}</a>`
      + (l.badge && CC_SCRIPT_URL ? `<span class="cc-badge" id="cc-badge" hidden>!</span>` : '')
      + (l.key ? `<button class="icon-btn" type="button" data-ql-edit="${l.id}" title="Update URL">✎</button>` : '')
      + `</span>`;
  }).join('');
  const input = $('#ql-input');
  if (input) { input.focus(); input.select(); }
}

async function checkCC() {
  if (!CC_SCRIPT_URL) return;
  try {
    const count = (await (await fetch(CC_SCRIPT_URL)).json()).count || 0;
    localStorage.setItem('cc_current_count', count);
    const seen = parseInt(localStorage.getItem(CC_SEEN_KEY) || '0', 10);
    const badge = $('#cc-badge');
    if (badge) { badge.hidden = count <= seen; badge.textContent = count - seen; }
  } catch { /* script unavailable */ }
}

export function initQuickLinks() {
  localStorage.removeItem('nl-submission-url'); // always use the hardcoded NL form URL
  const bar = $('#quick-links');
  bar.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.qlEdit) { editing = t.dataset.qlEdit; render(); }
    else if ('qlCancel' in t.dataset) { editing = null; render(); }
    else if (t.dataset.qlReset) { localStorage.removeItem(LINKS.find(l => l.id === t.dataset.qlReset).key); editing = null; render(); }
    else if (t.closest('[data-ql-cc]')) {
      localStorage.setItem(CC_SEEN_KEY, localStorage.getItem('cc_current_count') || '0');
      const b = $('#cc-badge'); if (b) b.hidden = true;
    }
  });
  bar.addEventListener('submit', e => {
    e.preventDefault();
    const link = LINKS.find(l => l.id === e.target.dataset.ql);
    const url = $('#ql-input').value.trim();
    if (!/^https?:\/\//i.test(url)) { $('#ql-input').classList.add('required-empty'); return; }
    localStorage.setItem(link.key, url);
    editing = null; render();
  });
  bar.addEventListener('keydown', e => { if (e.key === 'Escape' && editing) { editing = null; render(); } });
  render();
  if (CC_SCRIPT_URL) { checkCC(); setInterval(checkCC, 5 * 60 * 1000); }
}
