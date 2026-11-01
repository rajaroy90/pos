// PropertyOS boot: builds the shell, picks welcome or home, keeps things fresh.
import { h, $ } from './core/h.js';
import { icon } from './core/icons.js';
import { S, emit, on, nowTs, setMe, setPrefs } from './core/store.js';
import { detectLang, loadLang, t } from './core/i18n.js';
import { api, clearCache, refreshMe } from './core/api.js';
import { applyGlass, applySprings, applyTheme, haptic, probeFrames, sound } from './core/fx.js';
import { clearData, refreshAll, refreshData } from './core/data.js';
import { fmtClock } from './core/format.js';
import { closeAllLayers, toast } from './core/layers.js';
import { renderHome } from './shell/home.js';
import { renderWelcome } from './shell/welcome.js';
import { describe, openControlCentre, openNotifications } from './shell/panels.js';
import { hasPin, showLock } from './shell/pin.js';
import { getJoinCode, setJoinCode } from './apps/auth.js';
import { launch } from './apps/registry.js';

const rootEl = $('#root');
let os; let screenEl; let layersEl; let statusEl; let dockEl; let mode = '';
let lastPoll = 0; let hiddenAt = 0; let locked = false;

const WALL = { landlord: 'emerald', tenant: 'sky', guard: 'coral' };

// ---------- shell frame ----------
function buildOS() {
  screenEl = h('div', { class: 'screen' });
  layersEl = h('div', { id: 'layers' });
  statusEl = h('div', { class: 'statusbar' });
  os = h('div', { class: 'os' }, h('div', { class: 'wall' }), screenEl, statusEl, layersEl, h('div', { class: 'toasts', 'aria-live': 'polite' }));
  rootEl.prepend(os);
  new MutationObserver(syncLayers).observe(layersEl, { childList: true });
}

let goneTimer = 0;
function syncLayers() {
  const hasApp = !!layersEl.querySelector(':scope > .app');
  screenEl.classList.toggle('under', hasApp);
  if (dockEl) dockEl.classList.toggle('hidden', hasApp);
  clearTimeout(goneTimer);
  if (hasApp) goneTimer = setTimeout(() => screenEl.classList.add('gone'), 560);
  else screenEl.classList.remove('gone');
}

function applyAttrs() {
  const role = S.me ? S.role : 'none';
  os.dataset.role = role;
  os.dataset.wall = S.prefs.wall === 'auto' ? WALL[role] || 'sky' : S.prefs.wall;
}

// ---------- status bar & live pill ----------
function pillState() {
  if (!S.online) return { cls: 'off', text: t('pill.offline') };
  if (S.me && S.me.unread > 0) return { cls: 'alert', text: t('pill.new', { n: S.me.unread }) };
  return { cls: '', text: S.me ? t('pill.synced') : 'PropertyOS' };
}

let lastPill = '';
function renderStatus(pop = false) {
  const signed = !!S.me;
  const p = pillState();
  const key = `${mode}|${p.cls}|${p.text}`;
  const timeEl = h('div', { class: 'sb-time' }, signed ? fmtClock(nowTs()) : '');
  const pill = h('button', { class: `pill ${p.cls} ${pop && key !== lastPill ? 'pop' : ''}`, type: 'button', 'aria-label': p.text },
    h('span', { class: 'dot' }), p.text);
  lastPill = key;
  pill.addEventListener('click', () => {
    haptic();
    if (S.me && S.me.unread > 0) openNotifications();
    else if (S.me) { toast(t('pill.refreshing')); refreshAll().then(() => toast(t('pill.updated'), 'good')); }
  });
  const cc = h('button', { class: 'sb-btn press', type: 'button', 'aria-label': t('cc.title') }, icon('sliders', 22));
  cc.addEventListener('click', () => { haptic(); openControlCentre(); });
  const bell = signed ? h('button', { class: 'sb-btn press', type: 'button', 'aria-label': t('notif.title') },
    icon('bell', 22), S.me.unread ? h('span', { class: 'badge' }, S.me.unread > 9 ? '9+' : String(S.me.unread)) : null) : null;
  if (bell) bell.addEventListener('click', () => { haptic(); openNotifications(); });
  statusEl.replaceChildren(timeEl, signed ? pill : h('span'), h('div', { class: 'sb-right' }, bell, cc));
}

// ---------- screens ----------
function showWelcome() {
  mode = 'welcome';
  if (dockEl) { dockEl.remove(); dockEl = null; }
  applyAttrs();
  screenEl.scrollTop = 0;
  screenEl.replaceChildren(renderWelcome());
  renderStatus();
  syncLayers();
}

function showHome() {
  mode = 'home';
  applyAttrs();
  const keep = screenEl.scrollTop;
  const { home, dock } = renderHome();
  screenEl.replaceChildren(home);
  screenEl.scrollTop = mode === 'home' ? keep : 0;
  if (dockEl) dockEl.remove();
  dockEl = dock;
  os.append(dockEl);
  renderStatus();
  syncLayers();
}

function render() {
  if (!S.me) showWelcome(); else showHome();
}

// ---------- session ----------
async function signOut({ silent = false, expired = false } = {}) {
  if (!silent) { try { await api.post('/auth/logout'); } catch { /* offline: cookie will expire */ } }
  closeAllLayers();
  clearCache(); clearData();
  setMe(null);
  S.role = 'tenant';
  render();
  if (expired) toast(t('session.expired'), 'bad');
}

on('signout', () => signOut());
on('unauth', () => { if (S.me) signOut({ silent: true, expired: true }); });
on('signedin', async () => {
  clearData();
  render();
  await refreshData();
  maybeLock();
  const app = new URLSearchParams(location.search).get('app');
  if (app) { history.replaceState(null, '', location.pathname); launch(app); }
});
on('demo-switch', async () => { closeAllLayers(); await refreshAll(); render(); });
on('role', async () => { render(); await refreshData(); });
on('data', () => { if (mode === 'home') showHome(); });
on('me', () => { if (mode) renderStatus(true); });
on('unread', () => renderStatus());
on('online', () => renderStatus(true));
on('lang', async () => {
  const wasSettings = !!layersEl.querySelector('[data-app="settings"]');
  closeAllLayers();
  render();
  if (wasSettings) setTimeout(() => launch('settings'), 80);
});
on('prefs', (patch) => {
  if (patch && ('wall' in patch)) applyAttrs();
});

// ---------- app lock ----------
async function maybeLock() {
  if (!S.me || !S.prefs.pinOn || !hasPin() || locked) return;
  locked = true;
  const ok = await showLock({ onForgot: () => { emit('signout'); } });
  locked = false;
  if (!ok) { setPrefs({ pinOn: false }); }
}

// ---------- keeping fresh ----------
async function poll() {
  if (!S.me || document.hidden || !S.online) return;
  const before = S.me.unread;
  lastPoll = Date.now();
  try { await refreshMe(); } catch { return; }
  if (!S.me) return;
  if (S.me.unread > before) {
    haptic('success'); sound('success');
    try {
      const { items } = await api.get('/notifications?limit=1');
      if (items[0]) toast(describe(items[0]).title);
    } catch { /* ignore */ }
  }
  refreshData();
}
setInterval(() => { if (Date.now() - lastPoll > 38000) poll(); }, 10000);
setInterval(() => { if (mode && S.me && statusEl) { const el = $('.sb-time', statusEl); if (el) el.textContent = fmtClock(nowTs()); } }, 15000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (S.me && S.prefs.pinOn && hiddenAt && Date.now() - hiddenAt > 60000) maybeLock();
  if (S.me && Date.now() - lastPoll > 20000) poll();
});

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvent = e; });

// ---------- boot ----------
async function boot() {
  applyTheme();
  applySprings();
  const lang = S.prefs.lang || detectLang();
  S.prefs.lang = lang;
  await loadLang(lang);
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  applyGlass();
  buildOS();

  const params = new URLSearchParams(location.search);
  const join = params.get('join');
  if (join) { setJoinCode(join.toUpperCase().slice(0, 12)); history.replaceState(null, '', location.pathname + location.hash); }

  try {
    await refreshMe();
  } catch { setMe(null); }
  if (S.me) { await refreshData(); }
  render();
  requestAnimationFrame(() => { const b = $('.boot'); if (b) { b.classList.add('out'); setTimeout(() => b.remove(), 360); } });

  if (S.me) {
    maybeLock();
    if (getJoinCode()) { const m = await import('./apps/join.js'); m.open({ code: getJoinCode() }); }
    const app = params.get('app');
    if (app) launch(app);
  }
  if (location.hash.startsWith('#/verify/')) { const m = await import('./apps/verify.js'); m.open(location.hash.slice(9)); }
  setTimeout(probeFrames, 1800);
  lastPoll = Date.now();

  if ('serviceWorker' in navigator && !params.has('nosw')) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot().catch((e) => {
  console.error(e);
  rootEl.replaceChildren(h('div', { style: { padding: '32px', color: '#fff', fontFamily: 'sans-serif' } }, 'PropertyOS could not start. Please reload.'));
});
