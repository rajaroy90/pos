import { b64url, hmacHex, randomBytes, randomId, safeEqual, sha256Hex } from './crypto.js';
import { one, run } from './db.js';
import { ApiError, now } from './util.js';

export const COOKIE = 'po_s';
const SESSION_TTL = 30 * 86400;

export const AUTH_KEY_RE = /^[0-9a-f]{64}$/;

export function checkAuthKey(k) {
  if (typeof k !== 'string' || !AUTH_KEY_RE.test(k)) throw new ApiError(400, 'invalid_input', 'Invalid credentials format');
  return k;
}

/** Server-side hash of the client-derived key: HMAC(pepper, salt:key). The browser already did the slow PBKDF2. */
export async function hashKey(secret, salt, key) {
  return hmacHex(secret, `pw:${salt}:${key}`);
}

export async function verifyKey(secret, user, key) {
  const h = await hashKey(secret, user.key_salt, key);
  return safeEqual(h, user.key_hash);
}

export function newSalt() {
  return b64url(randomBytes(16));
}

export async function createSession(db, userId, ua = '') {
  const token = b64url(randomBytes(32));
  const id = await sha256Hex(token);
  const t = now();
  await run(db, 'INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen, ua) VALUES (?, ?, ?, ?, ?, ?)',
    id, userId, t, t + SESSION_TTL, t, ua.slice(0, 160));
  return token;
}

export function sessionCookie(token, secure, maxAge = SESSION_TTL) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function readCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  for (const part of c.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export async function userFromRequest(db, req) {
  const token = readCookie(req, COOKIE);
  if (!token || token.length < 20 || token.length > 100) return null;
  const id = await sha256Hex(token);
  const t = now();
  const s = await one(db, 'SELECT user_id, expires_at, last_seen FROM sessions WHERE id = ?', id);
  if (!s || s.expires_at < t) return null;
  const user = await one(db, 'SELECT * FROM users WHERE id = ?', s.user_id);
  if (!user) return null;
  if (t - s.last_seen > 86400) {
    await run(db, 'UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id = ?', t, t + SESSION_TTL, id);
  }
  return { ...user, _sid: id };
}

export async function destroySession(db, req) {
  const token = readCookie(req, COOKIE);
  if (token) await run(db, 'DELETE FROM sessions WHERE id = ?', await sha256Hex(token));
}

export async function destroyAllSessions(db, userId) {
  await run(db, 'DELETE FROM sessions WHERE user_id = ?', userId);
}

/** Make a code for invites / recovery. Stored as HMAC so a DB leak does not leak live codes. */
export async function codeHash(secret, code) {
  return hmacHex(secret, `code:${String(code).toUpperCase().replace(/[^0-9A-Z]/g, '')}`);
}

export { randomId };
