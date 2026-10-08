// Thin Supabase REST (PostgREST) client. Same project, anon key and tables as the
// original page. Every call throws on a non-2xx response so callers can roll back.
export const SUPA_URL = 'https://egqyhhqtcpssdwolbtvd.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVncXloaHF0Y3Bzc2R3b2xidHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjE4NjAsImV4cCI6MjA5NjU5Nzg2MH0.AYzOBpIj4RdbLxrKf_IEQOEurbxDVWtKra_jVZrHKPg';
const HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

export const TABLES = ['wthbf', 'tasks', 'personal_wthbf', 'personal_tasks'];

async function req(method, path, body, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: !!opts.keepalive,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch { /* ignore */ }
    throw new Error(`${res.status} ${res.statusText}${detail ? ': ' + detail : ''}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const enc = encodeURIComponent;

export const api = {
  list: table => req('GET', `${table}?select=*&order=sort_order.asc,id.asc`),
  categories: () => req('GET', 'categories?select=*&order=name.asc'),

  async insert(table, rows) { // rows: object or array; always resolves to an array of saved rows
    const out = await req('POST', table, rows);
    if (!Array.isArray(out) || !out.length) throw new Error('Save was not confirmed by the server');
    return out;
  },

  async update(table, id, patch, extraFilter = '') {
    const out = await req('PATCH', `${table}?id=eq.${enc(id)}${extraFilter}`, patch);
    if (!Array.isArray(out) || !out.length) {
      if (extraFilter) return null; // conditional update matched nothing (used as a lock)
      throw new Error('Item not found. It may have been deleted on another device');
    }
    return out[0];
  },

  remove: (table, id, opts) => req('DELETE', `${table}?id=eq.${enc(id)}`, undefined, opts),

  addCategory: async name => (await api.insert('categories', { name }))[0],
  removeCategory: name => req('DELETE', `categories?name=eq.${enc(name)}`),
};
