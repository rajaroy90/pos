// Money, dates and small formatters. India conventions: lakh grouping, IST.
import { S, nowTs } from './store.js';
import { t } from './i18n.js';

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const inr = (n) => '₹' + nf.format(Math.round(Number(n) || 0));
export const num = (n) => nf.format(Math.round(Number(n) || 0));

const locale = () => (S.prefs.lang === 'hi' ? 'hi-IN' : 'en-IN');
const cache = new Map();
function dtf(key, opts) {
  const k = locale() + key;
  if (!cache.has(k)) cache.set(k, new Intl.DateTimeFormat(locale(), { timeZone: 'Asia/Kolkata', ...opts }));
  return cache.get(k);
}
const ms = (ts) => ts * 1000;

export const fmtDate = (ts) => dtf('d', { day: 'numeric', month: 'short', year: 'numeric' }).format(ms(ts));
export const fmtDay = (ts) => dtf('dd', { day: 'numeric', month: 'short' }).format(ms(ts));
export const fmtWeekday = (ts) => dtf('wd', { weekday: 'long', day: 'numeric', month: 'long' }).format(ms(ts));
export const fmtTime = (ts) => dtf('t', { hour: 'numeric', minute: '2-digit', hour12: true }).format(ms(ts));
export const fmtClock = (ts) => dtf('c', { hour: '2-digit', minute: '2-digit', hour12: false }).format(ms(ts));
export const fmtDateTime = (ts) => `${fmtDay(ts)}, ${fmtTime(ts)}`;

/** 'YYYY-MM' → "Oct 2026" */
export function monthLabel(ym, long = false) {
  const [y, m] = ym.split('-').map(Number);
  return dtf(long ? 'ml' : 'ms', { month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 15));
}
export function monthShort(ym) {
  const [y, m] = ym.split('-').map(Number);
  return dtf('mo', { month: 'short', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 15));
}
export function addMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
export const curMonth = () => {
  const d = new Date((nowTs() + 19800) * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export function timeAgo(ts) {
  const d = nowTs() - ts;
  if (d < 45) return t('ago.now');
  if (d < 3600) return t('ago.m', { n: Math.max(1, Math.round(d / 60)) });
  if (d < 86400) return t('ago.h', { n: Math.round(d / 3600) });
  if (d < 86400 * 7) return t('ago.d', { n: Math.round(d / 86400) });
  return fmtDay(ts);
}

/** "2h 15m left" style countdown for passes. */
export function remaining(ts) {
  const s = ts - nowTs();
  if (s <= 0) return t('pass.expired');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return t('pass.days_left', { n: Math.round(h / 24) });
  if (h > 0) return t('pass.hm_left', { h, m });
  if (m > 0) return t('pass.m_left', { m });
  return t('pass.s_left', { s });
}

export const initials = (name) => {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

export function greetingKey() {
  const h = Number(dtf('h', { hour: '2-digit', hour12: false }).format(ms(nowTs()))) % 24;
  if (h < 5) return 'greet.night';
  if (h < 12) return 'greet.morning';
  if (h < 17) return 'greet.afternoon';
  if (h < 21) return 'greet.evening';
  return 'greet.night';
}

/** Digits only, with +91 default, for wa.me and tel: links. */
export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  return d;
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
export const waShare = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function upiLink({ pa, pn, am, tn }) {
  const q = new URLSearchParams({ pa, pn: pn || '', cu: 'INR' });
  if (am) q.set('am', Number(am).toFixed(2));
  if (tn) q.set('tn', tn);
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}
