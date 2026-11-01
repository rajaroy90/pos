import { all, notify, one, run, stmt, wipeProperty } from '../db.js';
import { codeHash } from '../auth.js';
import { randomCode, randomId } from '../crypto.js';
import { assistedEligible, ownedProperty, unitAccess } from '../access.js';
import { ApiError, int, isPeriod, normPhone, now, str, ymOf } from '../util.js';

const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
const INVITE_TTL = 7 * 86400;

function upiId(v) {
  const s = str(v, { max: 80, name: 'UPI ID' });
  if (s && !UPI_RE.test(s)) throw new ApiError(400, 'invalid_input', 'UPI ID looks wrong. It should look like name@bank.');
  return s;
}

const shiftMonth = (ym, delta) => {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
};

const unitView = (u) => ({
  id: u.id, property_id: u.property_id, label: u.label, rent: u.rent, deposit: u.deposit, due_day: u.due_day,
  start_month: u.start_month, tenant_name: u.tenant_name, tenant_phone: u.tenant_phone, tenant_linked: !!u.tenant_id,
});

function unitFields(b, { partial = false, curMonth }) {
  const o = {};
  if (!partial || b.label !== undefined) o.label = str(b.label, { min: 1, max: 30, name: 'unit name' });
  if (!partial || b.rent !== undefined) o.rent = int(b.rent ?? 0, { min: 0, max: 10_000_000, name: 'rent' });
  if (!partial || b.deposit !== undefined) o.deposit = int(b.deposit ?? 0, { min: 0, max: 100_000_000, name: 'deposit' });
  if (!partial || b.due_day !== undefined) o.due_day = int(b.due_day ?? 5, { min: 1, max: 31, name: 'due day' });
  if (!partial || b.start_month !== undefined) {
    const m = b.start_month || curMonth;
    if (!isPeriod(m)) throw new ApiError(400, 'invalid_input', 'Start month is not valid');
    o.start_month = m;
  }
  if (!partial || b.tenant_name !== undefined) o.tenant_name = str(b.tenant_name, { max: 60, name: 'tenant name' });
  if (!partial || b.tenant_phone !== undefined) o.tenant_phone = normPhone(b.tenant_phone);
  return o;
}

export function register(r) {
  r.add('GET', '/properties', async (ctx) => {
    const props = await all(ctx.db, 'SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at', ctx.user.id);
    const out = [];
    for (const p of props) {
      const units = await all(ctx.db, 'SELECT * FROM units WHERE property_id = ? ORDER BY label', p.id);
      const guards = await all(ctx.db,
        "SELECT u.id, u.name FROM members m JOIN users u ON u.id = m.user_id WHERE m.property_id = ? AND m.role = 'guard'", p.id);
      out.push({
        id: p.id, name: p.name, address: p.address, city: p.city, upi_id: p.upi_id, upi_name: p.upi_name,
        units: units.map(unitView), guards,
      });
    }
    return { properties: out };
  });

  r.add('POST', '/properties', async (ctx) => {
    const b = ctx.body;
    const n = await one(ctx.db, 'SELECT COUNT(*) AS n FROM properties WHERE owner_id = ?', ctx.user.id);
    if (n.n >= 20) throw new ApiError(400, 'limit', 'You have reached the limit of 20 properties.');
    const id = randomId(14);
    await run(ctx.db,
      'INSERT INTO properties (id, owner_id, name, address, city, upi_id, upi_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, ctx.user.id, str(b.name, { min: 2, max: 80, name: 'property name' }), str(b.address, { max: 200 }), str(b.city, { max: 60 }),
      upiId(b.upi_id), str(b.upi_name, { max: 60 }) || ctx.user.name, now());
    return { id };
  });

  r.add('PATCH', '/properties/:id', async (ctx) => {
    const p = await ownedProperty(ctx.db, ctx.user, ctx.params.id);
    const b = ctx.body;
    await run(ctx.db, 'UPDATE properties SET name = ?, address = ?, city = ?, upi_id = ?, upi_name = ? WHERE id = ?',
      b.name !== undefined ? str(b.name, { min: 2, max: 80, name: 'property name' }) : p.name,
      b.address !== undefined ? str(b.address, { max: 200 }) : p.address,
      b.city !== undefined ? str(b.city, { max: 60 }) : p.city,
      b.upi_id !== undefined ? upiId(b.upi_id) : p.upi_id,
      b.upi_name !== undefined ? str(b.upi_name, { max: 60 }) : p.upi_name,
      p.id);
    return {};
  });

  r.add('DELETE', '/properties/:id', async (ctx) => {
    const p = await ownedProperty(ctx.db, ctx.user, ctx.params.id);
    await wipeProperty(ctx.db, p.id);
    return {};
  });

  r.add('POST', '/properties/:id/units', async (ctx) => {
    const p = await ownedProperty(ctx.db, ctx.user, ctx.params.id);
    const n = await one(ctx.db, 'SELECT COUNT(*) AS n FROM units WHERE property_id = ?', p.id);
    if (n.n >= 200) throw new ApiError(400, 'limit', 'A property can have up to 200 units.');
    const f = unitFields(ctx.body, { curMonth: ymOf(now()) });
    if (await one(ctx.db, 'SELECT 1 AS x FROM units WHERE property_id = ? AND label = ?', p.id, f.label)) {
      throw new ApiError(409, 'duplicate', 'A unit with this name already exists.');
    }
    const id = randomId(14);
    await run(ctx.db,
      `INSERT INTO units (id, property_id, label, rent, deposit, due_day, start_month, tenant_name, tenant_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, p.id, f.label, f.rent, f.deposit, f.due_day, f.start_month, f.tenant_name, f.tenant_phone, now());
    return { id };
  });

  r.add('PATCH', '/units/:id', async (ctx) => {
    const { unit } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    const f = { ...unit, ...unitFields(ctx.body, { partial: true, curMonth: ymOf(now()) }) };
    // A rent change applies from a chosen month. Earlier months keep the rent that was agreed then.
    let hist = unit.rent_hist || '[]';
    if (f.rent !== unit.rent && (unit.tenant_id || unit.tenant_name)) {
      const cur = ymOf(now());
      let list = [];
      try { list = JSON.parse(hist); } catch { list = []; }
      let from = isPeriod(ctx.body.rent_from) ? ctx.body.rent_from : shiftMonth(cur, 1);
      const last = list.length ? list[list.length - 1].upto : shiftMonth(unit.start_month, -1);
      if (from <= last) from = shiftMonth(last, 1);
      if (from < unit.start_month) from = unit.start_month;
      if (from > shiftMonth(cur, 3)) from = shiftMonth(cur, 3);
      // Only record the old price if it actually applied to at least one month.
      if (shiftMonth(from, -1) > last) list.push({ upto: shiftMonth(from, -1), rent: unit.rent });
      hist = JSON.stringify(list.slice(-24));
    }
    if (f.label !== unit.label && await one(ctx.db, 'SELECT 1 AS x FROM units WHERE property_id = ? AND label = ? AND id <> ?', unit.property_id, f.label, unit.id)) {
      throw new ApiError(409, 'duplicate', 'A unit with this name already exists.');
    }
    await run(ctx.db,
      'UPDATE units SET label = ?, rent = ?, deposit = ?, due_day = ?, start_month = ?, tenant_name = ?, tenant_phone = ?, rent_hist = ? WHERE id = ?',
      f.label, f.rent, f.deposit, f.due_day, f.start_month, f.tenant_name, f.tenant_phone, hist, unit.id);
    return {};
  });

  r.add('DELETE', '/units/:id', async (ctx) => {
    const { unit } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    const q = (sql) => stmt(ctx.db, sql, unit.id);
    await ctx.db.batch([
      q('DELETE FROM ticket_photos WHERE ticket_id IN (SELECT id FROM tickets WHERE unit_id = ?)'),
      q('DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE unit_id = ?)'),
      q('DELETE FROM tickets WHERE unit_id = ?'),
      q('DELETE FROM payments WHERE unit_id = ?'),
      q('DELETE FROM visitors WHERE unit_id = ?'),
      q('DELETE FROM invites WHERE unit_id = ?'),
      q('DELETE FROM units WHERE id = ?'),
    ]);
    return {};
  });

  r.add('POST', '/units/:id/vacate', async (ctx) => {
    const { unit } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    const t = now();
    // Next tenant's ledger starts next month so old payments don't bleed into it.
    const d = new Date((t + 19800) * 1000);
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const nm = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    await ctx.db.batch([
      stmt(ctx.db, "UPDATE units SET tenant_id = NULL, tenant_name = '', tenant_phone = '', start_month = ?, tenant_since = ?, rent_hist = '[]' WHERE id = ?", nm, t + 1, unit.id),
      stmt(ctx.db, "UPDATE visitors SET status = 'cancelled' WHERE unit_id = ? AND status IN ('active','requested')", unit.id),
      stmt(ctx.db, 'DELETE FROM invites WHERE unit_id = ? AND used_at IS NULL', unit.id),
    ]);
    return {};
  });

  r.add('POST', '/units/:id/invite', async (ctx) => {
    const { unit, property } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    if (unit.tenant_id) throw new ApiError(409, 'unit_taken', 'This unit already has a tenant on PropertyOS.');
    const code = randomCode(8);
    await ctx.db.batch([
      stmt(ctx.db, 'DELETE FROM invites WHERE unit_id = ? AND used_at IS NULL', unit.id),
      stmt(ctx.db, 'INSERT INTO invites (code_hash, kind, property_id, unit_id, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        await codeHash(ctx.secret, code), 'tenant', property.id, unit.id, ctx.user.id, now() + INVITE_TTL),
    ]);
    return { code, link: `${ctx.origin}/?join=${code}`, expires_at: now() + INVITE_TTL };
  });

  r.add('POST', '/properties/:id/guard-invite', async (ctx) => {
    const p = await ownedProperty(ctx.db, ctx.user, ctx.params.id);
    const code = randomCode(8);
    await run(ctx.db, 'INSERT INTO invites (code_hash, kind, property_id, unit_id, created_by, expires_at) VALUES (?, ?, ?, NULL, ?, ?)',
      await codeHash(ctx.secret, code), 'guard', p.id, ctx.user.id, now() + INVITE_TTL);
    return { code, link: `${ctx.origin}/?join=${code}`, expires_at: now() + INVITE_TTL };
  });

  r.add('DELETE', '/properties/:id/guards/:userId', async (ctx) => {
    const p = await ownedProperty(ctx.db, ctx.user, ctx.params.id);
    await run(ctx.db, "DELETE FROM members WHERE property_id = ? AND user_id = ? AND role = 'guard'", p.id, ctx.params.userId);
    return {};
  });

  // One-time code a landlord can hand to a tenant who lost their password and recovery code.
  r.add('POST', '/units/:id/reset-code', async (ctx) => {
    const { unit } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    if (!unit.tenant_id) throw new ApiError(400, 'no_tenant', 'This unit has no linked tenant account.');
    const tenant = await one(ctx.db, 'SELECT id, email, is_demo FROM users WHERE id = ?', unit.tenant_id);
    if (!tenant) throw new ApiError(400, 'no_tenant', 'This unit has no linked tenant account.');
    // Safety: a landlord must not be able to take over an account that also touches other people's data.
    if (!(await assistedEligible(ctx.db, tenant.id))) {
      throw new ApiError(403, 'not_allowed', 'This account is used in other places. The tenant must reset with their own recovery code.');
    }
    const code = randomCode(10);
    await ctx.db.batch([
      stmt(ctx.db, "DELETE FROM recovery WHERE user_id = ? AND kind = 'assisted'", tenant.id),
      stmt(ctx.db, 'INSERT INTO recovery (id, user_id, code_hash, kind, expires_at) VALUES (?, ?, ?, ?, ?)',
        randomId(12), tenant.id, await codeHash(ctx.secret, code), 'assisted', now() + 86400),
    ]);
    return { code, email: tenant.email, expires_in_hours: 24 };
  });
}
