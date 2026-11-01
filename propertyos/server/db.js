import { MIGRATIONS } from './schema.js';
import { ApiError, now } from './util.js';

const migrated = new WeakSet();

/** Apply pending migrations once per isolate. Safe to race: batches are atomic. */
export async function ensureSchema(db) {
  if (migrated.has(db)) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run();
  const row = await db.prepare("SELECT v FROM meta WHERE k = 'schema_version'").first();
  let version = row ? Number(row.v) : 0;
  while (version < MIGRATIONS.length) {
    const stmts = MIGRATIONS[version]
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s));
    stmts.push(db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('schema_version', ?)").bind(String(version + 1)));
    try {
      await db.batch(stmts);
    } catch (e) {
      // Another isolate may have applied it first.
      const again = await db.prepare("SELECT v FROM meta WHERE k = 'schema_version'").first();
      if (again && Number(again.v) > version) { version = Number(again.v); continue; }
      throw e;
    }
    version++;
  }
  migrated.add(db);
}

export const one = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
export const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results || [];
export const run = (db, sql, ...args) => db.prepare(sql).bind(...args).run();
export const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);

/**
 * Fixed-window rate limit. Throws 429 when exceeded.
 * One atomic upsert, so many parallel requests cannot all slip under the limit.
 */
export async function rateLimit(db, key, max, windowSec) {
  const t = now();
  const row = await one(db,
    `INSERT INTO rl (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ? - window_start >= ? THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END
     RETURNING count`,
    key, t, t, windowSec, t, windowSec, t);
  if (row && row.count > max) {
    throw new ApiError(429, 'rate_limited', 'Too many attempts. Please wait and try again.');
  }
}

/** Housekeeping, run on a small share of requests: drop expired rate-limit rows, sessions, codes and old notices. */
export async function prune(db) {
  const t = now();
  await db.batch([
    stmt(db, 'DELETE FROM rl WHERE window_start < ?', t - 86400),
    stmt(db, 'DELETE FROM sessions WHERE expires_at < ?', t),
    stmt(db, "DELETE FROM recovery WHERE kind = 'assisted' AND expires_at < ?", t),
    stmt(db, 'DELETE FROM invites WHERE expires_at < ?', t - 30 * 86400),
    stmt(db, 'DELETE FROM notifications WHERE created_at < ?', t - 90 * 86400),
  ]);
}

export async function notify(db, userId, kind, data = {}, ref = '') {
  if (!userId) return;
  const { randomId } = await import('./crypto.js');
  await run(
    db,
    'INSERT INTO notifications (id, user_id, kind, data, ref, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    randomId(14), userId, kind, JSON.stringify(data), ref, now(),
  );
}

/** Remove one property and everything hanging off it. */
export async function wipeProperty(db, propertyId) {
  const q = (sql) => stmt(db, sql, propertyId);
  await db.batch([
    q('DELETE FROM ticket_photos WHERE ticket_id IN (SELECT id FROM tickets WHERE property_id = ?)'),
    q('DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE property_id = ?)'),
    q('DELETE FROM tickets WHERE property_id = ?'),
    q('DELETE FROM payments WHERE property_id = ?'),
    q('DELETE FROM visit_log WHERE property_id = ?'),
    q('DELETE FROM visitors WHERE property_id = ?'),
    q('DELETE FROM invites WHERE property_id = ?'),
    q('DELETE FROM members WHERE property_id = ?'),
    q('DELETE FROM units WHERE property_id = ?'),
    q('DELETE FROM properties WHERE id = ?'),
  ]);
}

/** Delete a user and their personal data. Properties they own are wiped. */
export async function wipeUser(db, userId) {
  const me = await one(db, 'SELECT email FROM users WHERE id = ?', userId);
  const props = await all(db, 'SELECT id FROM properties WHERE owner_id = ?', userId);
  for (const p of props) await wipeProperty(db, p.id);
  const q = (sql) => stmt(db, sql, userId);
  const steps = [
    // Things they raised or hosted name them and their guests: remove them.
    q('DELETE FROM ticket_photos WHERE ticket_id IN (SELECT id FROM tickets WHERE created_by = ?)'),
    q('DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE created_by = ?)'),
    q('DELETE FROM tickets WHERE created_by = ?'),
    q('DELETE FROM ticket_events WHERE user_id = ?'),
    q('DELETE FROM visit_log WHERE visitor_id IN (SELECT id FROM visitors WHERE host_id = ?)'),
    q('DELETE FROM visitors WHERE host_id = ?'),
    // The landlord keeps the rent records, without the tenant's name or notes.
    q("UPDATE payments SET tenant_name = '' WHERE unit_id IN (SELECT id FROM units WHERE tenant_id = ?)"),
    q("UPDATE payments SET note = '' WHERE created_by = ?"),
    stmt(db, "UPDATE units SET tenant_id = NULL, tenant_name = '', tenant_phone = '', tenant_since = ?, rent_hist = '[]' WHERE tenant_id = ?", now() + 1, userId),
    q('UPDATE invites SET used_by = NULL WHERE used_by = ?'),
    q("UPDATE visit_log SET guard_id = '' WHERE guard_id = ?"),
    q('DELETE FROM members WHERE user_id = ?'),
    q('DELETE FROM sessions WHERE user_id = ?'),
    q('DELETE FROM consents WHERE user_id = ?'),
    q('DELETE FROM recovery WHERE user_id = ?'),
    q('DELETE FROM notifications WHERE user_id = ?'),
    q('DELETE FROM rl WHERE instr(key, ?) > 0'),
  ];
  if (me && me.email) steps.push(stmt(db, 'DELETE FROM rl WHERE instr(key, ?) > 0', me.email));
  steps.push(q('DELETE FROM users WHERE id = ?'));
  await db.batch(steps);
}
