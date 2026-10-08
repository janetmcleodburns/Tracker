// Small DOM helpers shared by all modules.
export const $ = (sel, root = document) => root.querySelector(sel);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

// Escape, then turn bare http(s) links into clickable links.
export const linkify = v => esc(v).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g,
  url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);

let syncTimer = null;
export function setSync(state, msg) {
  const dot = $('#sync-dot'), label = $('#sync-label');
  if (!dot) return;
  clearTimeout(syncTimer);
  dot.className = 'sync-dot' + (state === 'syncing' ? ' syncing' : state === 'error' ? ' error' : '');
  label.textContent = msg || (state === 'syncing' ? 'Saving…' : state === 'error' ? 'Sync error' : 'Synced ✓');
}

export function toast(message, { type = 'info', action, onAction, timeout = 4000 } = {}) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}<button type="button" aria-label="Dismiss">✕</button>`;
  const close = () => el.remove();
  const [actBtn, xBtn] = action ? el.querySelectorAll('button') : [null, el.querySelector('button')];
  if (actBtn) actBtn.onclick = () => { close(); onAction?.(); };
  xBtn.onclick = close;
  box.appendChild(el);
  if (timeout) setTimeout(close, type === 'error' ? Math.max(timeout, 8000) : timeout);
  return close;
}

// Voice dictation into any input/textarea (Chrome / Safari).
let recognition = null;
export function startMic(btn) {
  const target = document.getElementById(btn.dataset.target);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Voice dictation is not supported in this browser. Try Chrome or Safari.', { type: 'error' }); return; }
  const reset = () => { document.querySelectorAll('.mic-btn.listening').forEach(b => { b.classList.remove('listening'); b.textContent = '🎤'; }); };
  if (recognition) { recognition.stop(); recognition = null; reset(); return; }
  recognition = new SR();
  recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
  btn.classList.add('listening'); btn.textContent = '🛑';
  recognition.onresult = e => {
    const said = e.results[0][0].transcript;
    if (target) {
      target.value = target.value.trim() ? `${target.value.trim()} ${said}` : said;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  recognition.onerror = recognition.onend = () => { recognition = null; reset(); };
  recognition.start();
}

export const micBtn = id => `<button type="button" class="mic-btn" data-action="mic" data-target="${id}" title="Dictate">🎤</button>`;
