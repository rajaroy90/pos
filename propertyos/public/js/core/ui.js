// Shared UI pieces: buttons, fields, segmented controls, empty states, app frame.
import { h } from './h.js';
import { icon } from './icons.js';
import { haptic, sound } from './fx.js';
import { t } from './i18n.js';
import { errMessage } from './api.js';
import { toast, openApp } from './layers.js';

export function toastError(e) {
  if (!(e && e.code)) console.error(e);
  haptic('error');
  toast(errMessage(e), 'bad');
}

/** Button. onClick may be async: the button shows a spinner and errors become toasts. */
export function Btn(label, { kind = '', size = '', icon: ic, onClick, block = false, disabled = false, type = 'button', quiet = false } = {}) {
  const el = h('button', { class: `btn ${kind} ${size} ${block ? 'block' : ''} press`, type, disabled },
    ic ? icon(ic, size === 'xs' ? 15 : 19) : null, label !== undefined && label !== null ? h('span', null, label) : null);
  if (onClick) {
    el.addEventListener('click', async (ev) => {
      if (el.classList.contains('busy')) return;
      if (!quiet) { haptic(); sound('tap'); }
      let r;
      try { r = onClick(ev, el); } catch (e) { toastError(e); return; }
      if (r && typeof r.then === 'function') {
        el.classList.add('busy');
        try { await r; } catch (e) { if (e && e.name !== 'AbortError') toastError(e); } finally { el.classList.remove('busy'); }
      }
    });
  }
  return el;
}

/** Labelled input. Returns { el, input, get, set, error }. */
export function Field({
  label, type = 'text', value = '', placeholder = '', hint = '', autocomplete = 'off', inputmode, maxlength, textarea = false,
  big = false, name, rows, required = false, onInput, upper = false,
} = {}) {
  const attrs = { class: `${textarea ? 'textarea' : 'input'} ${big ? 'big' : ''}`, placeholder, autocomplete, name, maxlength, inputmode, required, rows };
  const input = textarea ? h('textarea', attrs, value) : h('input', { ...attrs, type, value });
  if (upper) input.style.textTransform = 'uppercase';
  const err = h('div', { class: 'err', role: 'alert' });
  let control = input;
  if (type === 'password') {
    const eye = h('button', { type: 'button', 'aria-label': t('common.show'), class: 'press' }, icon('eye', 20));
    eye.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; });
    control = h('div', { class: 'pw' }, input, eye);
  }
  const el = h('div', { class: 'field' },
    label ? h('label', null, label) : null, control, hint ? h('div', { class: 'hint' }, hint) : null, err);
  input.addEventListener('input', () => { el.classList.remove('bad'); err.textContent = ''; if (onInput) onInput(input.value); });
  return {
    el, input,
    get: () => (type === 'number' ? input.value : input.value.trim()),
    raw: () => input.value,
    set: (v) => { input.value = v; },
    error: (m) => { err.textContent = m || ''; el.classList.toggle('bad', !!m); if (m) input.focus(); },
  };
}

/** Native select (best keyboard and picker on Android). options: [{ v, label }] */
export function Select({ label, options, value, onChange }) {
  const sel = h('select', { class: 'select' }, options.map((o) => h('option', { value: o.v, selected: o.v === value }, o.label)));
  sel.value = value;
  if (onChange) sel.addEventListener('change', () => onChange(sel.value));
  const el = h('div', { class: 'field' }, label ? h('label', null, label) : null, sel);
  return { el, sel, get: () => sel.value, set: (v) => { sel.value = v; } };
}

/** Segmented control. options: [{ v, label }]. */
export function Seg(options, value, onChange) {
  let cur = value;
  const btns = options.map((o) => {
    const b = h('button', { type: 'button', class: o.v === cur ? 'on' : '' }, o.label);
    b.addEventListener('click', () => { if (cur === o.v) return; cur = o.v; sync(); haptic(); onChange(cur); });
    return b;
  });
  const el = h('div', { class: 'seg', role: 'tablist' }, btns);
  function sync() { btns.forEach((b, i) => b.classList.toggle('on', options[i].v === cur)); }
  return { el, get: () => cur, set: (v) => { cur = v; sync(); } };
}

/** Single-choice chips. options: [{ v, label, icon? }] */
export function Chips(options, value, onChange) {
  let cur = value;
  const btns = options.map((o) => {
    const b = h('button', { type: 'button', class: `opt press ${o.v === cur ? 'on' : ''}` }, o.icon ? icon(o.icon, 16) : null, o.label);
    b.addEventListener('click', () => { cur = o.v; sync(); haptic(); if (onChange) onChange(cur); });
    return b;
  });
  const el = h('div', { class: 'chips' }, btns);
  function sync() { btns.forEach((b, i) => b.classList.toggle('on', options[i].v === cur)); }
  return { el, get: () => cur, set: (v) => { cur = v; sync(); } };
}

export function Check(text, checked = false, onChange) {
  const el = h('button', { type: 'button', class: `check ${checked ? 'on' : ''}`, role: 'checkbox', 'aria-checked': String(checked) }, h('i', null, icon('check', 16)), h('span', null, text));
  el.addEventListener('click', () => {
    checked = !checked;
    el.classList.toggle('on', checked);
    el.setAttribute('aria-checked', String(checked));
    haptic();
    if (onChange) onChange(checked);
  });
  return { el, get: () => checked };
}

export function Switch(on, onChange) {
  const el = h('button', { type: 'button', class: `switch ${on ? 'on' : ''}`, role: 'switch', 'aria-checked': String(on) });
  el.addEventListener('click', () => {
    on = !on;
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
    haptic();
    onChange(on);
  });
  return el;
}

export function Empty(ic, title, text, action) {
  return h('div', { class: 'empty' },
    h('div', { class: 'em-ico' }, icon(ic, 30)),
    h('h3', null, title), text ? h('p', null, text) : null, action || null);
}

export const Skeleton = (n = 4) => h('div', { class: 'stack tight' }, Array.from({ length: n }, () => h('div', { class: 'sk' })));
export const StaleNote = () => h('div', { class: 'stale' }, icon('clock', 16), t('common.stale'));

export function Chip(text, kind = '') { return h('span', { class: `chip ${kind}` }, text); }

/** List row. opts: { lead, title, sub, trail, onClick } */
export function Item({ lead, title, sub, trail, onClick, tag = 'button' }) {
  const el = h(onClick ? tag : 'div', { class: 'item', type: onClick ? 'button' : undefined },
    lead || h('span'),
    h('div', { class: 'grow' }, h('div', { class: 't ellipsis' }, title), sub ? h('div', { class: 's' }, sub) : null),
    trail || h('span'));
  if (onClick) el.addEventListener('click', () => { haptic(); onClick(); });
  return el;
}

export const Avatar = (text, kind = '') => h('div', { class: `avatar ${kind}` }, text);

/**
 * Standard app frame: glass header with Back, title and actions.
 * Returns { el, body, setTitle, close } once opened.
 */
export function AppFrame({ title, subtitle, actions = [], from, onClose, flush = false, fab }) {
  const titleEl = h('div', { class: 'app-title' }, title, subtitle ? h('small', null, subtitle) : null);
  const back = h('button', { class: 'round press', type: 'button', 'aria-label': t('common.back') }, icon('left', 22));
  const body = h('div', { class: `app-body ${flush ? 'flush' : ''}` });
  const head = h('div', { class: 'app-head' }, back, titleEl, h('div', { class: 'head-actions' }, actions));
  const el = h('div', { class: 'app', role: 'main' }, head, body, fab || null);
  const layer = openApp(el, { from, onClose });
  back.addEventListener('click', () => { haptic(); layer.close(); });
  return {
    el, body, head, close: layer.close,
    setTitle: (x, s) => { titleEl.firstChild.textContent = x; const sm = titleEl.querySelector('small'); if (sm) sm.textContent = s || ''; },
  };
}

export const RoundBtn = (ic, label, onClick, accent = false) => {
  const b = h('button', { class: `round press ${accent ? 'accent' : ''}`, type: 'button', 'aria-label': label }, icon(ic, 21));
  b.addEventListener('click', () => { haptic(); onClick(b); });
  return b;
};

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => toast(t('common.copied'), 'good'), () => toast(t('common.copy_failed'), 'bad'));
  const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text);
  document.body.append(ta); ta.select();
  try { document.execCommand('copy'); toast(t('common.copied'), 'good'); } catch { toast(t('common.copy_failed'), 'bad'); }
  ta.remove();
  return Promise.resolve();
}

export async function shareText(text, url) {
  if (navigator.share) {
    try { await navigator.share({ text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  await copyText(url ? `${text}\n${url}` : text);
}
