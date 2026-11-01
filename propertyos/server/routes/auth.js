import { all, notify, one, rateLimit, run, stmt, wipeUser } from '../db.js';
import {
  checkAuthKey, codeHash, createSession, destroyAllSessions, destroySession, hashKey, newSalt, sessionCookie, verifyKey,
} from '../auth.js';
import { randomCode, randomId } from '../crypto.js';
import { assistedEligible, rolesOf } from '../access.js';
import {
  ApiError, int, looksLikeEmail, normEmail, normPhone, now, oneOf, str, ymOf,
} from '../util.js';

export const CONSENT_VERSION = '2026-10';

export const publicUser = (u) => ({
  id: u.id, email: u.email, name: u.name, phone: u.phone, lang: u.lang, is_demo: !!u.is_demo, role_hint: u.role_hint,
});

const fmtRecovery = (c) => c.match(/.{1,4}/g).join('-');

async function makeRecovery(ctx, userId) {
  const code = randomCode(16);
  await run(ctx.db, "DELETE FROM recovery WHERE user_id = ? AND kind = 'recovery'", userId);
  await run(ctx.db, 'INSERT INTO recovery (id, user_id, code_hash, kind, expires_at) VALUES (?, ?, ?, ?, ?)',
    randomId(12), userId, await codeHash(ctx.secret, code), 'recovery', 4102444800);
  return fmtRecovery(code);
}

/** Mark an invite used. Only one caller can win, even if two people submit the same code at once. */
async function claimInvite(ctx, user, codeHashValue, t) {
  const res = await run(ctx.db, 'UPDATE invites SET used_by = ?, used_at = ? WHERE code_hash = ? AND used_at IS NULL', user.id, t, codeHashValue);
  if (res.meta && res.meta.changes === 0) throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
}

/** Accept a tenant or guard invite for an existing user. */
export async function acceptInvite(ctx, user, rawCode) {
  if (user.is_demo) throw new ApiError(403, 'demo_blocked', 'Not available in the demo.');
  const code = str(rawCode, { min: 4, max: 20, name: 'code' });
  const h = await codeHash(ctx.secret, code);
  const inv = await one(ctx.db, 'SELECT * FROM invites WHERE code_hash = ?', h);
  const t = now();
  if (!inv || inv.used_at || inv.expires_at < t) throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
  const property = await one(ctx.db, 'SELECT * FROM properties WHERE id = ?', inv.property_id);
  if (!property) throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
  if (property.owner_id === user.id) throw new ApiError(400, 'invite_own', 'You cannot join your own property.');

  if (inv.kind === 'tenant') {
    const unit = await one(ctx.db, 'SELECT * FROM units WHERE id = ?', inv.unit_id);
    if (!unit) throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
    if (unit.tenant_id && unit.tenant_id !== user.id) throw new ApiError(409, 'unit_taken', 'This unit already has a tenant.');
    await claimInvite(ctx, user, h, t);
    const taken = await run(ctx.db,
      'UPDATE units SET tenant_id = ?, tenant_name = ?, tenant_phone = CASE WHEN tenant_phone = \'\' THEN ? ELSE tenant_phone END WHERE id = ? AND (tenant_id IS NULL OR tenant_id = ?)',
      user.id, user.name, user.phone || '', unit.id, user.id);
    if (taken.meta && taken.meta.changes === 0) throw new ApiError(409, 'unit_taken', 'This unit already has a tenant.');
    await notify(ctx.db, property.owner_id, 'tenant_joined', { name: user.name, unit: unit.label, property: property.name });
    return { kind: 'tenant', property_id: property.id, unit_id: unit.id };
  }
  if (inv.kind === 'guard') {
    await claimInvite(ctx, user, h, t);
    await run(ctx.db, "INSERT OR IGNORE INTO members (user_id, property_id, role) VALUES (?, ?, 'guard')", user.id, property.id);
    await notify(ctx.db, property.owner_id, 'guard_joined', { name: user.name, property: property.name });
    return { kind: 'guard', property_id: property.id };
  }
  throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
}

export async function peekInvite(ctx, rawCode) {
  const h = await codeHash(ctx.secret, str(rawCode, { min: 4, max: 20, name: 'code' }));
  const inv = await one(ctx.db, 'SELECT * FROM invites WHERE code_hash = ?', h);
  if (!inv || inv.used_at || inv.expires_at < now()) throw new ApiError(400, 'invite_invalid', 'This invite is not valid or has expired.');
  return inv;
}

export function register(r) {
  r.add('POST', '/auth/signup', async (ctx) => {
    await rateLimit(ctx.db, `signup:${ctx.ip}`, 30, 3600);
    const b = ctx.body;
    if (b.consent !== true) throw new ApiError(400, 'consent_required', 'Please accept the privacy notice to continue.');
    const email = normEmail(b.email);
    if (!looksLikeEmail(email)) throw new ApiError(400, 'invalid_input', 'Enter a valid email address');
    const name = str(b.name, { min: 2, max: 60, name: 'name' });
    const phone = normPhone(b.phone);
    const key = checkAuthKey(b.authKey);
    const lang = b.lang === 'hi' ? 'hi' : 'en';
    let role = oneOf(b.role || 'landlord', ['landlord', 'tenant'], 'role');

    let invite = null;
    if (b.inviteCode) {
      invite = await peekInvite(ctx, b.inviteCode);
      role = invite.kind === 'guard' ? 'guard' : 'tenant';
    }
    if (await one(ctx.db, 'SELECT 1 AS x FROM users WHERE email = ?', email)) {
      throw new ApiError(409, 'email_taken', 'An account with this email already exists. Sign in instead.');
    }
    const id = randomId(16);
    const salt = newSalt();
    await run(ctx.db,
      'INSERT INTO users (id, email, name, phone, role_hint, key_hash, key_salt, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, email, name, phone, role, await hashKey(ctx.secret, salt, key), salt, lang, now());
    await run(ctx.db, 'INSERT INTO consents (user_id, version, at) VALUES (?, ?, ?)', id, CONSENT_VERSION, now());
    const user = await one(ctx.db, 'SELECT * FROM users WHERE id = ?', id);
    if (invite) {
      try { await acceptInvite(ctx, user, b.inviteCode); } catch (e) { await wipeUser(ctx.db, id); throw e; }
    }
    const recovery = await makeRecovery(ctx, id);
    const token = await createSession(ctx.db, id, ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure));
    return { user: publicUser(user), recovery };
  }, { auth: false });

  r.add('POST', '/auth/login', async (ctx) => {
    const email = normEmail(ctx.body.email);
    const key = checkAuthKey(ctx.body.authKey);
    await rateLimit(ctx.db, `login-ip:${ctx.ip}`, 40, 600);
    await rateLimit(ctx.db, `login-em:${email}:${ctx.ip}`, 8, 600); // one person at one network
    await rateLimit(ctx.db, `login-all:${email}`, 80, 3600); // slows guessing from many networks
    const user = await one(ctx.db, 'SELECT * FROM users WHERE email = ?', email);
    const dummy = { key_salt: 'x'.repeat(22), key_hash: '0'.repeat(64) };
    const ok = await verifyKey(ctx.secret, user || dummy, key);
    if (!user || !ok) throw new ApiError(401, 'bad_login', 'Email or password is incorrect.');
    const token = await createSession(ctx.db, user.id, ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure));
    return { user: publicUser(user) };
  }, { auth: false });

  r.add('POST', '/auth/logout', async (ctx) => {
    await destroySession(ctx.db, ctx.req);
    ctx.cookies.push(sessionCookie('', ctx.secure, 0));
    return {};
  }, { auth: false });

  r.add('POST', '/auth/reset', async (ctx) => {
    const email = normEmail(ctx.body.email);
    const key = checkAuthKey(ctx.body.authKey);
    await rateLimit(ctx.db, `reset-ip:${ctx.ip}`, 15, 3600);
    await rateLimit(ctx.db, `reset-em:${email}:${ctx.ip}`, 5, 3600);
    await rateLimit(ctx.db, `reset-all:${email}`, 30, 3600);
    const fail = () => new ApiError(400, 'reset_invalid', 'That email and code do not match, or the code has expired.');
    const user = await one(ctx.db, 'SELECT * FROM users WHERE email = ?', email);
    const h = await codeHash(ctx.secret, str(ctx.body.code, { min: 4, max: 40, name: 'code' }));
    if (!user) throw fail();
    const rec = await one(ctx.db, 'SELECT * FROM recovery WHERE user_id = ? AND code_hash = ? AND expires_at > ?', user.id, h, now());
    if (!rec) throw fail();
    // A code a landlord handed out only works while the account still touches nothing but that one flat.
    if (rec.kind === 'assisted' && !(await assistedEligible(ctx.db, user.id))) throw fail();
    const salt = newSalt();
    await run(ctx.db, 'UPDATE users SET key_hash = ?, key_salt = ? WHERE id = ?', await hashKey(ctx.secret, salt, key), salt, user.id);
    await destroyAllSessions(ctx.db, user.id);
    await run(ctx.db, "DELETE FROM recovery WHERE id = ? OR (user_id = ? AND kind = 'assisted')", rec.id, user.id);
    await notify(ctx.db, user.id, 'password_reset', { how: rec.kind });
    const recovery = await makeRecovery(ctx, user.id);
    const token = await createSession(ctx.db, user.id, ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure));
    return { user: publicUser(user), recovery };
  }, { auth: false });

  r.add('GET', '/me', async (ctx) => {
    const u = ctx.user;
    const roles = await rolesOf(ctx.db, u);
    const [owned, tenancies, guardProps, unread] = await Promise.all([
      all(ctx.db, 'SELECT id, name, city, upi_id, upi_name FROM properties WHERE owner_id = ? ORDER BY created_at', u.id),
      all(ctx.db,
        `SELECT u.id AS unit_id, u.label, u.rent, p.id AS property_id, p.name AS property_name, p.upi_id, p.upi_name
         FROM units u JOIN properties p ON p.id = u.property_id WHERE u.tenant_id = ? ORDER BY p.name, u.label`, u.id),
      all(ctx.db,
        `SELECT p.id, p.name FROM members m JOIN properties p ON p.id = m.property_id
         WHERE m.user_id = ? AND m.role = 'guard' ORDER BY p.name`, u.id),
      one(ctx.db, 'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', u.id),
    ]);
    return {
      user: publicUser(u), roles, properties: owned, tenancies, guard_properties: guardProps, unread: unread.n,
      server_time: now(), month: ymOf(now()),
    };
  });

  r.add('PATCH', '/me', async (ctx) => {
    const b = ctx.body;
    const name = b.name !== undefined ? str(b.name, { min: 2, max: 60, name: 'name' }) : ctx.user.name;
    const phone = b.phone !== undefined ? normPhone(b.phone) : ctx.user.phone;
    const lang = b.lang !== undefined ? oneOf(b.lang, ['en', 'hi'], 'language') : ctx.user.lang;
    await run(ctx.db, 'UPDATE users SET name = ?, phone = ?, lang = ? WHERE id = ?', name, phone, lang, ctx.user.id);
    return { user: publicUser({ ...ctx.user, name, phone, lang }) };
  });

  r.add('POST', '/me/password', async (ctx) => {
    if (ctx.user.is_demo) throw new ApiError(403, 'demo_blocked', 'Not available in the demo.');
    await rateLimit(ctx.db, `pw:${ctx.user.id}`, 10, 3600);
    const oldKey = checkAuthKey(ctx.body.authKey);
    const newKey = checkAuthKey(ctx.body.newKey);
    if (!(await verifyKey(ctx.secret, ctx.user, oldKey))) throw new ApiError(403, 'bad_login', 'Current password is incorrect.');
    const salt = newSalt();
    await run(ctx.db, 'UPDATE users SET key_hash = ?, key_salt = ? WHERE id = ?', await hashKey(ctx.secret, salt, newKey), salt, ctx.user.id);
    await destroyAllSessions(ctx.db, ctx.user.id);
    await run(ctx.db, "DELETE FROM recovery WHERE user_id = ? AND kind = 'assisted'", ctx.user.id);
    const token = await createSession(ctx.db, ctx.user.id, ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure));
    return {};
  });

  r.add('POST', '/join', async (ctx) => {
    await rateLimit(ctx.db, `join:${ctx.user.id}`, 15, 3600);
    return acceptInvite(ctx, ctx.user, ctx.body.code);
  });

  r.add('GET', '/invite/peek', async (ctx) => {
    await rateLimit(ctx.db, `peek:${ctx.ip}`, 100, 3600);
    const inv = await peekInvite(ctx, ctx.url.searchParams.get('code') || '');
    const p = await one(ctx.db, 'SELECT name FROM properties WHERE id = ?', inv.property_id);
    const u = inv.unit_id ? await one(ctx.db, 'SELECT label FROM units WHERE id = ?', inv.unit_id) : null;
    return { kind: inv.kind, property: p ? p.name : '', unit: u ? u.label : '' };
  }, { auth: false });

  r.add('GET', '/me/export', async (ctx) => {
    const u = ctx.user;
    const owned = await all(ctx.db, 'SELECT * FROM properties WHERE owner_id = ?', u.id);
    const out = { exported_at: now(), user: publicUser(u), properties: [], tenancies: [] };
    for (const p of owned) {
      out.properties.push({
        ...p,
        units: await all(ctx.db, 'SELECT * FROM units WHERE property_id = ?', p.id),
        payments: await all(ctx.db, 'SELECT * FROM payments WHERE property_id = ?', p.id),
        tickets: await all(ctx.db, 'SELECT * FROM tickets WHERE property_id = ?', p.id),
        ticket_events: await all(ctx.db, 'SELECT e.* FROM ticket_events e JOIN tickets t ON t.id = e.ticket_id WHERE t.property_id = ?', p.id),
        visitors: await all(ctx.db, 'SELECT * FROM visitors WHERE property_id = ?', p.id),
        visit_log: await all(ctx.db, 'SELECT * FROM visit_log WHERE property_id = ?', p.id),
      });
    }
    const rented = await all(ctx.db, 'SELECT * FROM units WHERE tenant_id = ?', u.id);
    for (const un of rented) {
      const since = un.tenant_since || 0;
      out.tenancies.push({
        unit: un,
        payments: await all(ctx.db, 'SELECT * FROM payments WHERE unit_id = ? AND created_at >= ?', un.id, since),
        tickets: await all(ctx.db, 'SELECT * FROM tickets WHERE unit_id = ? AND created_at >= ?', un.id, since),
        ticket_events: await all(ctx.db,
          'SELECT e.* FROM ticket_events e JOIN tickets t ON t.id = e.ticket_id WHERE t.unit_id = ? AND t.created_at >= ?', un.id, since),
        visitors: await all(ctx.db, 'SELECT * FROM visitors WHERE host_id = ? AND unit_id = ?', u.id, un.id),
      });
    }
    out.notifications = await all(ctx.db, 'SELECT kind, data, created_at, read_at FROM notifications WHERE user_id = ?', u.id);
    out.consents = await all(ctx.db, 'SELECT version, at FROM consents WHERE user_id = ?', u.id);
    return new Response(JSON.stringify(out, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="propertyos-my-data.json"',
        'cache-control': 'no-store',
      },
    });
  });

  r.add('POST', '/me/delete', async (ctx) => {
    if (ctx.user.is_demo) throw new ApiError(403, 'demo_blocked', 'Not available in the demo.');
    await rateLimit(ctx.db, `del:${ctx.user.id}`, 5, 3600);
    const key = checkAuthKey(ctx.body.authKey);
    if (!(await verifyKey(ctx.secret, ctx.user, key))) throw new ApiError(403, 'bad_login', 'Password is incorrect.');
    await wipeUser(ctx.db, ctx.user.id);
    ctx.cookies.push(sessionCookie('', ctx.secure, 0));
    return {};
  });
}
