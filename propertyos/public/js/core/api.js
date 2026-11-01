// API client. Passwords never leave the phone: we stretch them with PBKDF2 and send only the derived key.
import { S, emit, setMe } from './store.js';
import { t, hasKey } from './i18n.js';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function setOnline(v) {
  if (S.online !== v) { S.online = v; emit('online', v); }
}
window.addEventListener('online', () => setOnline(true));
window.addEventListener('offline', () => setOnline(false));

async function raw(method, path, body, opts = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'x-po': '1', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal: opts.signal,
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    setOnline(false);
    throw new ApiError('offline', t('err.offline'), 0);
  }
  setOnline(true);
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (!res.ok || !data || data.ok === false) {
    if (res.status === 401 && !opts.quiet401) emit('unauth');
    const code = (data && data.error) || 'server_error';
    const key = `ecode.${code}`;
    // The server speaks English; for other languages use our own wording where we have it.
    const message = S.prefs.lang !== 'en' && hasKey(key) ? t(key) : (data && data.message) || t('err.generic');
    throw new ApiError(code, message, res.status);
  }
  return data;
}

export const api = {
  get: (p, o) => raw('GET', p, undefined, o),
  post: (p, b, o) => raw('POST', p, b || {}, o),
  patch: (p, b, o) => raw('PATCH', p, b || {}, o),
  del: (p, o) => raw('DELETE', p, undefined, o),
};

// ---- stale cache so screens open instantly (and offline) with the last data ----
const CP = 'po:c:';
const uid = () => (S.me && S.me.user ? S.me.user.id : 'anon');
function cacheSet(path, data) {
  try { localStorage.setItem(`${CP}${uid()}:${path}`, JSON.stringify({ t: Date.now(), d: data })); } catch { /* quota */ }
}
export function cacheGet(path) {
  try {
    const raw = localStorage.getItem(`${CP}${uid()}:${path}`);
    return raw ? JSON.parse(raw).d : null;
  } catch { return null; }
}
export function clearCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(CP)) localStorage.removeItem(k);
  } catch { /* ignore */ }
}

/** GET with fallback to the last good copy. Returns { data, stale }. */
export async function load(path) {
  try {
    const data = await raw('GET', path);
    if (!/^\/(tickets\/|guard\/walkin)/.test(path)) cacheSet(path, data);
    return { data, stale: false };
  } catch (e) {
    if (e.code === 'offline' || e.status >= 500) {
      const c = cacheGet(path);
      if (c) return { data: c, stale: true };
    }
    throw e;
  }
}

// ---- credentials ----
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function deriveKey(email, password) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(String(password).normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 210000, salt: enc.encode(`propertyos:v1:${String(email).trim().toLowerCase()}`) },
    base, 256,
  );
  return hex(bits);
}

export async function refreshMe() {
  const { data, stale } = await load('/me');
  setMe(data);
  return { data, stale };
}

export function errMessage(e) {
  if (e instanceof ApiError) return e.message;
  if (e && e.code === 'offline') return t('err.offline');
  return t('err.generic');
}
