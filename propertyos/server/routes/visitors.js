import { all, notify, one, rateLimit, run, stmt } from '../db.js';
import { hmacHex, randomDigits, randomId, safeEqual } from '../crypto.js';
import { gateAccess, unitAccess } from '../access.js';
import { ApiError, int, now, str } from '../util.js';

const WALKIN_TTL = 15 * 60;
const APPROVED_TTL = 2 * 3600;

async function passToken(secret, v) {
  const exp = v.valid_to.toString(36);
  const sig = (await hmacHex(secret, `pass:${v.id}:${v.valid_to}`)).slice(0, 16);
  return `${v.id}.${exp}.${sig}`;
}

async function view(secret, v, extra = {}) {
  return {
    id: v.id, unit_id: v.unit_id, name: v.name, purpose: v.purpose, status: v.status, code: v.code,
    valid_from: v.valid_from, valid_to: v.valid_to, max_uses: v.max_uses, uses: v.uses, by_guard: !!v.by_guard,
    created_at: v.created_at, last_used_at: v.last_used_at,
    token: v.status === 'active' ? `PO1:${await passToken(secret, v)}` : '',
    ...extra,
  };
}

async function freshCode(db, propertyId) {
  for (let i = 0; i < 8; i++) {
    const c = randomDigits(6);
    const clash = await one(db, "SELECT 1 AS x FROM visitors WHERE property_id = ? AND code = ? AND status IN ('active','requested') AND valid_to > ?", propertyId, c, now());
    if (!clash) return c;
  }
  throw new ApiError(503, 'busy', 'Could not create a code. Try again.');
}

async function logEntry(db, propertyId, guardId, visitorId, result, name = '') {
  await run(db, 'INSERT INTO visit_log (id, visitor_id, property_id, at, guard_id, result, name) VALUES (?, ?, ?, ?, ?, ?, ?)',
    randomId(14), visitorId, propertyId, now(), guardId, result, name);
}

/** Core check shared by scan and manual code entry. Returns { result, visitor } */
async function useVisitor(ctx, property, visitor) {
  const t = now();
  if (visitor.property_id !== property.id) return { result: 'wrong_property' };
  if (visitor.status === 'cancelled' || visitor.status === 'denied') return { result: visitor.status, visitor };
  if (visitor.status === 'requested') return { result: 'waiting', visitor };
  if (visitor.status === 'used' || visitor.uses >= visitor.max_uses) return { result: 'used', visitor };
  if (t > visitor.valid_to) return { result: 'expired', visitor };
  if (t < visitor.valid_from - 60) return { result: 'not_yet', visitor };
  const uses = visitor.uses + 1;
  const status = uses >= visitor.max_uses ? 'used' : 'active';
  // Guard against double-scan races: only increment if uses is unchanged.
  const res = await run(ctx.db, 'UPDATE visitors SET uses = ?, status = ?, last_used_at = ? WHERE id = ? AND uses = ?', uses, status, t, visitor.id, visitor.uses);
  if (res.meta && res.meta.changes === 0) return { result: 'used', visitor };
  return { result: 'allowed', visitor: { ...visitor, uses, status } };
}

export function register(r) {
  // ---- resident side ----
  r.add('GET', '/visitors', async (ctx) => {
    const rows = await all(ctx.db,
      `SELECT v.*, u.label AS unit_label, p.name AS property_name FROM visitors v
       JOIN units u ON u.id = v.unit_id JOIN properties p ON p.id = v.property_id
       WHERE v.host_id = ? OR p.owner_id = ?
       ORDER BY v.created_at DESC LIMIT 60`, ctx.user.id, ctx.user.id);
    const out = [];
    for (const v of rows) {
      let status = v.status;
      if ((status === 'active' || status === 'requested') && v.valid_to < now()) status = 'expired';
      out.push(await view(ctx.secret, { ...v, status }, { unit: v.unit_label, property: v.property_name }));
    }
    return { visitors: out };
  });

  r.add('POST', '/visitors', async (ctx) => {
    await rateLimit(ctx.db, `pass:${ctx.user.id}`, 30, 3600);
    const b = ctx.body;
    const { unit, property, as } = await unitAccess(ctx.db, ctx.user, str(b.unit_id, { min: 1, max: 40, name: 'unit' }));
    const name = str(b.name, { min: 1, max: 60, name: 'visitor name' });
    const purpose = str(b.purpose, { max: 80, name: 'purpose' });
    const hours = int(b.hours ?? 12, { min: 1, max: 72, name: 'hours' });
    const max_uses = int(b.max_uses ?? 1, { min: 1, max: 20, name: 'entries' });
    const t = now();
    const id = randomId(14);
    const code = await freshCode(ctx.db, property.id);
    await run(ctx.db,
      `INSERT INTO visitors (id, property_id, unit_id, host_id, name, purpose, status, code, valid_from, valid_to, max_uses, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      id, property.id, unit.id, ctx.user.id, name, purpose, code, t, t + hours * 3600, max_uses, t);
    const v = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', id);
    return { visitor: await view(ctx.secret, v, { unit: unit.label, property: property.name }), as };
  });

  r.add('POST', '/visitors/:id/cancel', async (ctx) => {
    const v = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', ctx.params.id);
    if (!v) throw new ApiError(404, 'not_found', 'Not found');
    await unitAccess(ctx.db, ctx.user, v.unit_id);
    if (v.status !== 'active' && v.status !== 'requested') throw new ApiError(409, 'bad_state', 'This pass is no longer active.');
    await run(ctx.db, "UPDATE visitors SET status = 'cancelled' WHERE id = ?", v.id);
    return {};
  });

  r.add('POST', '/visitors/:id/respond', async (ctx) => {
    const v = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', ctx.params.id);
    if (!v) throw new ApiError(404, 'not_found', 'Not found');
    await unitAccess(ctx.db, ctx.user, v.unit_id);
    if (v.status !== 'requested' || v.valid_to < now()) throw new ApiError(409, 'bad_state', 'This request is no longer waiting.');
    const t = now();
    if (ctx.body.approve === true) {
      await run(ctx.db, "UPDATE visitors SET status = 'active', valid_from = ?, valid_to = ? WHERE id = ?", t, t + APPROVED_TTL, v.id);
      return { status: 'active' };
    }
    await run(ctx.db, "UPDATE visitors SET status = 'denied' WHERE id = ?", v.id);
    return { status: 'denied' };
  });

  // ---- gate side ----
  r.add('GET', '/guard/overview', async (ctx) => {
    const property = await gateAccess(ctx.db, ctx.user, ctx.url.searchParams.get('property_id') || '');
    const t = now();
    const units = await all(ctx.db, 'SELECT id, label, tenant_id FROM units WHERE property_id = ? ORDER BY label', property.id);
    const labelOf = new Map(units.map((u) => [u.id, u.label]));
    const live = await all(ctx.db,
      `SELECT * FROM visitors WHERE property_id = ? AND status IN ('active','requested','denied') AND valid_to > ? ORDER BY created_at DESC LIMIT 60`,
      property.id, t - 3600);
    const recent = await all(ctx.db, 'SELECT l.*, v.unit_id FROM visit_log l LEFT JOIN visitors v ON v.id = l.visitor_id WHERE l.property_id = ? ORDER BY l.at DESC LIMIT 25', property.id);
    const clean = (v) => ({
      id: v.id, name: v.name, purpose: v.purpose, status: v.status, unit: labelOf.get(v.unit_id) || '', by_guard: !!v.by_guard,
      valid_to: v.valid_to, uses: v.uses, max_uses: v.max_uses,
    });
    return {
      property: { id: property.id, name: property.name },
      units: units.map((u) => ({ id: u.id, label: u.label, occupied: !!u.tenant_id })),
      expected: live.filter((v) => v.status === 'active' && !v.by_guard).map(clean),
      walkins: live.filter((v) => v.by_guard).map(clean),
      recent: recent.map((l) => ({ id: l.id, at: l.at, result: l.result, name: l.name, unit: labelOf.get(l.unit_id) || '' })),
      server_time: t,
    };
  });

  r.add('POST', '/guard/verify', async (ctx) => {
    await rateLimit(ctx.db, `gv:${ctx.user.id}`, 120, 600);
    const property = await gateAccess(ctx.db, ctx.user, str(ctx.body.property_id, { min: 1, max: 40, name: 'property' }));
    let visitor = null;
    if (ctx.body.token) {
      const raw = str(ctx.body.token, { max: 120, name: 'token' }).replace(/^PO1:/, '');
      const [id, exp36, sig] = raw.split('.');
      if (!id || !exp36 || !sig) return { result: 'not_found' };
      const row = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', id);
      if (!row) return { result: 'not_found' };
      const expected = (await hmacHex(ctx.secret, `pass:${row.id}:${row.valid_to}`)).slice(0, 16);
      if (!safeEqual(expected, sig) || row.valid_to.toString(36) !== exp36) return { result: 'not_found' };
      visitor = row;
    } else {
      const code = str(ctx.body.code, { min: 4, max: 8, name: 'code' }).replace(/\D/g, '');
      if (code.length < 4) return { result: 'not_found' };
      visitor = await one(ctx.db,
        "SELECT * FROM visitors WHERE property_id = ? AND code = ? AND status IN ('active','requested') ORDER BY created_at DESC LIMIT 1", property.id, code);
      if (!visitor) return { result: 'not_found' };
    }
    const foreignPass = visitor.property_id !== property.id;
    const unit = foreignPass ? null : await one(ctx.db, 'SELECT label, tenant_id FROM units WHERE id = ?', visitor.unit_id);
    const { result, visitor: v } = await useVisitor(ctx, property, visitor);
    // A pass from another building must not leak its holder's name into this building's log.
    const foreign = result === 'wrong_property';
    await logEntry(ctx.db, property.id, ctx.user.id, foreign ? null : visitor.id, result, foreign ? '' : visitor.name);
    if (result === 'allowed' && visitor.host_id) {
      await notify(ctx.db, visitor.host_id, 'visitor_arrived', { name: visitor.name, unit: unit?.label || '' }, visitor.id);
    }
    return {
      result,
      visitor: v ? { name: v.name, purpose: v.purpose, unit: unit?.label || '', uses: v.uses, max_uses: v.max_uses, valid_to: v.valid_to } : null,
    };
  });

  r.add('POST', '/guard/walkin', async (ctx) => {
    await rateLimit(ctx.db, `gw:${ctx.user.id}`, 60, 3600);
    const property = await gateAccess(ctx.db, ctx.user, str(ctx.body.property_id, { min: 1, max: 40, name: 'property' }));
    const unit = await one(ctx.db, 'SELECT * FROM units WHERE id = ? AND property_id = ?', str(ctx.body.unit_id, { min: 1, max: 40, name: 'unit' }), property.id);
    if (!unit) throw new ApiError(404, 'not_found', 'Unit not found');
    if (!unit.tenant_id) throw new ApiError(400, 'no_host', 'This unit has no resident on PropertyOS to ask.');
    const name = str(ctx.body.name, { min: 1, max: 60, name: 'visitor name' });
    const purpose = str(ctx.body.purpose, { max: 80, name: 'purpose' });
    const t = now();
    const id = randomId(14);
    await run(ctx.db,
      `INSERT INTO visitors (id, property_id, unit_id, host_id, name, purpose, status, code, valid_from, valid_to, max_uses, by_guard, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, 1, 1, ?)`,
      id, property.id, unit.id, unit.tenant_id, name, purpose, await freshCode(ctx.db, property.id), t, t + WALKIN_TTL, t);
    await notify(ctx.db, unit.tenant_id, 'visitor_request', { name, purpose, unit: unit.label, property: property.name }, id);
    return { id };
  });

  r.add('GET', '/guard/walkin/:id', async (ctx) => {
    const v = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', ctx.params.id);
    if (!v) throw new ApiError(404, 'not_found', 'Not found');
    await gateAccess(ctx.db, ctx.user, v.property_id);
    let status = v.status;
    if ((status === 'requested' || status === 'active') && v.valid_to < now()) status = 'expired';
    return { id: v.id, status, name: v.name };
  });

  r.add('POST', '/guard/admit', async (ctx) => {
    const v = await one(ctx.db, 'SELECT * FROM visitors WHERE id = ?', str(ctx.body.id, { min: 1, max: 40, name: 'visitor' }));
    if (!v) throw new ApiError(404, 'not_found', 'Not found');
    const property = await gateAccess(ctx.db, ctx.user, v.property_id);
    if (!v.by_guard) throw new ApiError(400, 'bad_state', 'Scan the pass or enter its code instead.');
    const { result } = await useVisitor(ctx, property, v);
    await logEntry(ctx.db, property.id, ctx.user.id, v.id, result, v.name);
    return { result };
  });
}
