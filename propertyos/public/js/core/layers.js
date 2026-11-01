// Layer manager: apps, sheets and panels stack on one history stack, so Android's Back button closes the top layer.
import { h, $ } from './h.js';
import { icon } from './icons.js';
import { haptic, reducedMotion, sound } from './fx.js';
import { t } from './i18n.js';

const stack = [];
let suppress = 0;

const layersRoot = () => $('#layers');
const anim = (el, keyframes, opts) => (reducedMotion() ? null : el.animate(keyframes, opts));

window.addEventListener('popstate', () => {
  if (suppress > 0) { suppress--; return; }
  const top = stack.pop();
  if (top) top.finish();
});

function register(layer) {
  stack.push(layer);
  history.pushState({ po: stack.length }, '');
}

/** Close one layer by hand (button, scrim tap). Keeps the history stack in step. */
function dismiss(layer) {
  const i = stack.indexOf(layer);
  if (i < 0) return;
  // only the top layer can be dismissed; anything above it goes first
  while (stack.length - 1 > i) { const above = stack.pop(); above.finish(true); suppress++; history.back(); }
  stack.pop();
  layer.finish();
  suppress++;
  history.back();
}

export function closeAllLayers() {
  const n = stack.length;
  if (!n) return;
  const all = stack.splice(0, n).reverse();
  for (const l of all) l.finish(true);
  suppress++;
  history.go(-n);
}

export const topLayerCount = () => stack.length;

// ---------- apps (full screen, open from the icon) ----------
/**
 * Open a full-screen app layer. `from` is the tapped icon element (for the open animation).
 * Returns { el, close }.
 */
export function openApp(el, { from, onClose } = {}) {
  const root = layersRoot();
  root.append(el);
  let done = false;
  const layer = {
    el,
    finish(instant) {
      if (done) return;
      done = true;
      if (onClose) onClose();
      const a = !instant && anim(el, [
        { transform: 'none', opacity: 1, borderRadius: '0px' },
        { transform: 'translateY(6%) scale(.94)', opacity: 0, borderRadius: '32px' },
      ], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      if (a) a.onfinish = () => el.remove(); else el.remove();
    },
  };
  register(layer);

  const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null;
  if (r && !reducedMotion()) {
    const rootRect = root.getBoundingClientRect();
    const sx = r.width / rootRect.width;
    const cx = r.left + r.width / 2 - rootRect.left;
    const cy = r.top + r.height / 2 - rootRect.top;
    const dx = cx - rootRect.width / 2;
    const dy = cy - rootRect.height / 2;
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx})`, opacity: 0.2, borderRadius: `${17 / sx}px` },
      { transform: 'none', opacity: 1, borderRadius: '0px' },
    ], { duration: 480, easing: getComputedStyle(document.documentElement).getPropertyValue('--smooth') || 'cubic-bezier(.22,1,.36,1)' });
  } else if (!reducedMotion()) {
    el.animate([{ transform: 'translateY(8%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  sound('open');
  return { el, close: () => dismiss(layer) };
}

// ---------- sheets ----------
/**
 * Bottom sheet. `build(api)` returns the body content; api = { close, setTitle }.
 * Returns { close, el }.
 */
export function openSheet({ title = '', build, onClose, dismissable = true }) {
  const root = layersRoot();
  const titleEl = h('h2', null, title);
  const body = h('div', { class: 'sheet-body' });
  const closeBtn = dismissable ? h('button', { class: 'x press', type: 'button', 'aria-label': t('common.close') }, icon('x', 18)) : null;
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'grab' }),
    h('div', { class: 'sheet-head' }, titleEl, closeBtn),
    body);
  const scrim = h('div', { class: 'scrim' });
  const wrap = h('div', { class: 'sheet-wrap' }, scrim, sheet);
  root.append(wrap);

  let done = false;
  const layer = {
    el: wrap,
    finish(instant) {
      if (done) return;
      done = true;
      if (onClose) onClose();
      if (instant || reducedMotion()) { wrap.remove(); return; }
      sheet.classList.add('out');
      scrim.classList.add('out');
      setTimeout(() => wrap.remove(), 240);
    },
  };
  register(layer);
  const close = () => dismiss(layer);
  if (dismissable) {
    scrim.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    enableDrag(sheet, close);
  }
  const api = { close, setTitle: (x) => { titleEl.textContent = x; }, el: sheet, body };
  const content = build(api);
  if (content) body.append(...[].concat(content));
  return api;
}

function enableDrag(sheet, close) {
  const handles = [sheet.querySelector('.grab'), sheet.querySelector('.sheet-head')];
  let y0 = 0; let dy = 0; let t0 = 0; let active = false;
  const down = (e) => {
    if (e.target.closest('button')) return;
    active = true; y0 = e.clientY; dy = 0; t0 = e.timeStamp;
    sheet.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!active) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  };
  const up = (e) => {
    if (!active) return;
    active = false;
    sheet.classList.remove('dragging');
    const v = dy / Math.max(1, e.timeStamp - t0);
    if (dy > 120 || v > 0.7) { sheet.style.transform = ''; close(); return; }
    sheet.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 380, easing: getComputedStyle(document.documentElement).getPropertyValue('--spring') || 'ease-out' });
    sheet.style.transform = '';
  };
  for (const el of handles) {
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}

// ---------- panels (notifications, control centre) ----------
export function openPanel(content, { onClose } = {}) {
  const root = layersRoot();
  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: 'panel glass', role: 'dialog' }, content);
  const wrap = h('div', { class: 'panel-wrap', style: { position: 'absolute', inset: 0, zIndex: 40 } }, scrim, panel);
  root.append(wrap);
  let done = false;
  const layer = {
    el: wrap,
    finish(instant) {
      if (done) return;
      done = true;
      if (onClose) onClose();
      if (instant || reducedMotion()) { wrap.remove(); return; }
      panel.classList.add('out'); scrim.classList.add('out');
      setTimeout(() => wrap.remove(), 220);
    },
  };
  register(layer);
  const close = () => dismiss(layer);
  scrim.addEventListener('click', close);
  return { close, panel };
}

// ---------- confirm dialog ----------
export function confirmSheet({ title, text, confirm, danger = false, cancel }) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (v, api) => { answered = true; resolve(v); api.close(); };
    openSheet({
      title,
      onClose: () => { if (!answered) resolve(false); },
      build: (api) => [
        text ? h('p', { class: 'muted' }, text) : null,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn press', type: 'button', onClick: () => answer(false, api) }, cancel || t('common.cancel')),
          h('button', { class: `btn ${danger ? 'danger' : 'primary'} press`, type: 'button', onClick: () => { haptic(); answer(true, api); } }, confirm || t('common.ok'))),
      ],
    });
  });
}

// ---------- toast ----------
export function toast(message, kind = '') {
  const root = $('.toasts');
  if (!root) return;
  const el = h('div', { class: `toast ${kind}`, role: 'status' }, message);
  root.append(el);
  if (root.children.length > 3) root.firstChild.remove();
  const gone = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  setTimeout(gone, kind === 'bad' ? 4200 : 2600);
}
