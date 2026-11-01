// Tiny shared state + event bus. No framework: screens re-render themselves when topics fire.
const KEY = 'po:prefs';

const DEFAULT_PREFS = {
  lang: '',          // '' = not chosen yet (detected from the browser)
  theme: 'auto',     // auto | light | dark
  glass: 'auto',     // auto | 0 | 1 | 2
  wall: 'auto',      // auto (by role) | sky | emerald | coral | dusk | graphite
  haptics: true,
  sound: false,
  role: '',          // last active role for people who have more than one
  pinOn: false,
  glassAuto: 1,      // result of the first-launch speed probe
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* storage can be blocked */ }
  return { ...DEFAULT_PREFS };
}

export const S = {
  me: null,            // GET /me payload (null when signed out)
  role: 'tenant',      // active role
  prefs: readPrefs(),
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  skew: 0,             // server clock minus device clock, in seconds
  data: {},            // per-screen cached payloads (rent board, tickets, ...)
  installEvent: null,
};

const subs = new Map();
export function on(topic, fn) {
  if (!subs.has(topic)) subs.set(topic, new Set());
  subs.get(topic).add(fn);
  return () => subs.get(topic).delete(fn);
}
export function emit(topic, payload) {
  const set = subs.get(topic);
  if (set) for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error(e); } }
}

export function setPrefs(patch) {
  Object.assign(S.prefs, patch);
  try { localStorage.setItem(KEY, JSON.stringify(S.prefs)); } catch { /* ignore */ }
  emit('prefs', patch);
}

/** Current time in seconds, corrected for a wrong phone clock. */
export const nowTs = () => Math.floor(Date.now() / 1000 + S.skew);

export function setMe(payload) {
  S.me = payload;
  if (payload && payload.server_time) S.skew = payload.server_time - Date.now() / 1000;
  if (payload) {
    const roles = payload.roles || [];
    if (!roles.includes(S.role)) S.role = roles.includes(S.prefs.role) ? S.prefs.role : roles[0] || 'landlord';
  }
  emit('me', payload);
}

export function setRole(role) {
  S.role = role;
  setPrefs({ role });
  emit('role', role);
}

export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
