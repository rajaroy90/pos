// Pieces shared by several apps: status chips, QR box, receipts, file download.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { qrPath } from '../core/qr.js';
import { fmtDate, inr, monthLabel, waShare } from '../core/format.js';
import { Btn, Chip, Skeleton, shareText } from '../core/ui.js';
import { openSheet } from '../core/layers.js';

const CHIP = {
  paid: ['good', 'st.paid'], overdue: ['bad', 'st.overdue'], partial: ['warn', 'st.partial'], due: ['info', 'st.due'],
  pending: ['warn', 'st.waiting'], confirmed: ['good', 'st.confirmed'], rejected: ['bad', 'st.rejected'],
  vacant: ['', 'st.vacant'], na: ['', 'st.na'],
};
export const statusChip = (s) => (CHIP[s] ? Chip(t(CHIP[s][1]), CHIP[s][0]) : Chip(s));
export const methodLabel = (m) => t(`method.${m}`);
export const methodIcon = (m) => ({ upi: 'upi', cash: 'cash', bank: 'bank', other: 'receipt' }[m] || 'receipt');

/** Black-on-white QR code for any text up to ~210 bytes. */
export function QRBox(text, label = '') {
  let box;
  try {
    const { d, size } = qrPath(text, 2);
    box = h('svg', { viewBox: `0 0 ${size} ${size}`, 'shape-rendering': 'crispEdges', role: 'img', 'aria-label': label || 'QR code' },
      h('rect', { width: size, height: size, fill: '#fff' }), h('path', { d, fill: '#000' }));
  } catch {
    box = h('div', { class: 'small muted center' }, t('qr.too_long'));
  }
  return h('div', { class: 'qr' }, box);
}

/** Save text as a file (CSV, JSON) from the browser. */
export function downloadFile(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(/csv/.test(type) ? ['\ufeff', text] : [text], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function receiptText(r) {
  return t('receipt.share_text', {
    no: r.receipt_no, amt: inr(r.amount), month: monthLabel(r.period), property: r.property, unit: r.unit, url: r.verify_url,
  });
}

/** Full receipt sheet, for landlord and tenant. */
export function openReceipt(paymentId) {
  openSheet({
    title: t('receipt.title'),
    build: (sh) => {
      const box = h('div', { class: 'stack' }, Skeleton(3));
      api.get(`/payments/${encodeURIComponent(paymentId)}/receipt`).then((r) => {
        const kv = [
          [t('receipt.no'), r.receipt_no], [t('receipt.for'), monthLabel(r.period, true)], [t('receipt.paid_on'), fmtDate(r.paid_on)],
          [t('receipt.method'), methodLabel(r.method)], r.utr ? [t('receipt.utr'), r.utr] : null,
          [t('receipt.unit'), `${r.property}, ${r.unit}`], r.tenant ? [t('receipt.tenant'), r.tenant] : null, [t('receipt.landlord'), r.landlord],
        ].filter(Boolean);
        box.replaceChildren(
          h('div', { class: 'receipt' },
            h('div', { class: 'rhead' }, h('b', null, 'PropertyOS'), Chip(t('st.confirmed'), 'good')),
            h('div', { class: 'amt num' }, inr(r.amount)),
            h('dl', { class: 'kv selectable' }, kv.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
            h('div', { class: 'tear' }),
            h('div', { class: 'seal' }, QRBox(r.verify_url, t('receipt.verify')), h('div', { class: 'small muted' }, t('receipt.verify_note')))),
          h('div', { class: 'btn-row' },
            Btn(t('common.share'), { kind: 'primary', icon: 'share', onClick: () => shareText(receiptText(r)) }),
            Btn('WhatsApp', { icon: 'chat', onClick: () => { window.open(waShare(receiptText(r)), '_blank', 'noopener'); } })),
          h('p', { class: 'tiny faint center' }, t('receipt.note')));
      }).catch((e) => box.replaceChildren(h('p', { class: 'muted' }, e.message)));
      return box;
    },
  });
}

export const avatarText = (label) => String(label).slice(0, 3);
export { icon };
