// Small WebCrypto helpers. Works in Cloudflare Workers and Node 20+.
const enc = new TextEncoder();

export const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Random id, lowercase base32, uniform (32 symbols per byte & 31). */
export function randomId(len = 16) {
  const b = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += B32[b[i] & 31].toLowerCase();
  return s;
}

/** Human-typeable code, e.g. K7QM2XWD */
export function randomCode(len = 8) {
  const b = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += B32[b[i] & 31];
  return s;
}

/** Uniform digits via rejection sampling. */
export function randomDigits(len = 6) {
  let s = '';
  while (s.length < len) {
    const b = randomBytes(len * 2);
    for (const x of b) {
      if (x < 250 && s.length < len) s += String(x % 10);
    }
  }
  return s;
}

export function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(str) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}

export async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const n = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
