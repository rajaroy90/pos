// Public receipt check: opened from the QR on a receipt (#/verify/<no>.<sig>). Works without signing in.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { inr, monthLabel, fmtDate } from '../core/format.js';
import { AppFrame, Btn, Skeleton } from '../core/ui.js';
import { haptic } from '../core/fx.js';

export function open(arg) {
  const raw = typeof arg === 'string' ? arg : (arg && arg.token) || '';
  const dot = raw.indexOf('.');
  const no = decodeURIComponent(dot > 0 ? raw.slice(0, dot) : raw);
  const sig = decodeURIComponent(dot > 0 ? raw.slice(dot + 1) : '');
  const frame = AppFrame({ title: t('ver.title'), onClose: () => { if (location.hash.startsWith('#/verify/')) history.replaceState(null, '', location.pathname); } });
  const box = h('div', { class: 'stack' }, Skeleton(3));
  frame.body.append(box);

  (async () => {
    let r = null; let err = null;
    try { r = await api.get(`/receipts/verify?no=${encodeURIComponent(no)}&sig=${encodeURIComponent(sig)}`); } catch (e) { err = e; }
    if (err) { box.replaceChildren(h('div', { class: 'result bad' }, h('div', { class: 'big-check bad' }, icon('alert', 44)), h('h2', null, t('common.error_title')), h('div', { class: 'small muted' }, err.message))); return; }
    haptic(r.valid ? 'success' : 'error');
    if (!r.valid) {
      box.replaceChildren(
        h('div', { class: 'result bad' }, h('div', { class: 'big-check bad' }, icon('x', 44)), h('h2', null, t('ver.invalid')), h('div', { class: 'small muted' }, t('ver.invalid_sub'))));
      return;
    }
    box.replaceChildren(
      h('div', { class: 'result good' }, h('div', { class: 'big-check good' }, icon('check', 44)), h('h2', null, t('ver.valid')), h('div', { class: 'small muted' }, t('ver.valid_sub'))),
      h('div', { class: 'card' }, h('dl', { class: 'kv selectable' },
        [[t('receipt.no'), r.receipt_no], [t('receipt.unit'), `${r.property}, ${r.unit}`], [t('receipt.for'), monthLabel(r.period, true)], [t('ver.amount'), inr(r.amount)], [t('receipt.paid_on'), r.paid_on ? fmtDate(r.paid_on) : '—']]
          .map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))),
      h('p', { class: 'small faint center' }, t('ver.privacy')));
  })();
  return frame;
}
