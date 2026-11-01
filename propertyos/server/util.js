export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export const IST = 19800; // UTC+05:30 in seconds
export const now = () => Math.floor(Date.now() / 1000);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** IST calendar fields for an epoch-seconds timestamp. */
export function istParts(ts) {
  const d = new Date((ts + IST) * 1000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const ymOf = (ts) => {
  const p = istParts(ts);
  return `${p.y}-${pad2(p.m)}`;
};

export function daysInMonth(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Epoch seconds for the END of the due day (IST) of a period. */
export function dueEnd(period, dueDay) {
  const [y, m] = period.split('-').map(Number);
  const day = Math.min(Math.max(1, dueDay | 0), daysInMonth(period));
  return Math.floor(Date.UTC(y, m - 1, day, 23, 59, 59) / 1000) - IST;
}

/** Inclusive list of YYYY-MM from start to end. Capped to the most recent `cap` months. */
export function monthsBetween(start, end, cap = 36) {
  const out = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad2(m)}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out.length > cap ? out.slice(out.length - cap) : out;
}

export const isPeriod = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

// ---- input validation ----
export function str(v, { min = 0, max = 200, name = 'field', trim = true } = {}) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw new ApiError(400, 'invalid_input', `${name} must be text`);
  if (trim) v = v.trim();
  if (v.length < min) throw new ApiError(400, 'invalid_input', `${name} is required`);
  if (v.length > max) throw new ApiError(400, 'invalid_input', `${name} is too long`);
  // strip control chars except newline/tab
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function int(v, { min = 0, max = 1e9, name = 'field' } = {}) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) throw new ApiError(400, 'invalid_input', `${name} must be a whole number`);
  if (n < min || n > max) throw new ApiError(400, 'invalid_input', `${name} is out of range`);
  return n;
}

export function oneOf(v, list, name = 'field') {
  if (!list.includes(v)) throw new ApiError(400, 'invalid_input', `${name} is not valid`);
  return v;
}

export const normEmail = (e) => str(e, { min: 3, max: 120, name: 'email' }).toLowerCase();
export const looksLikeEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Keep digits and a leading +. India-friendly: 10 digits -> +91. */
export function normPhone(p) {
  if (!p) return '';
  let s = String(p).replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(s)) s = '+91' + s;
  if (/^0\d{10}$/.test(s)) s = '+91' + s.slice(1);
  if (/^91\d{10}$/.test(s)) s = '+' + s;
  return s.slice(0, 16);
}
