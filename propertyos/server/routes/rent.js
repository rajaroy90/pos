import { all, notify, one, rateLimit, run } from '../db.js';
import { hmacHex, randomCode, randomId, safeEqual } from '../crypto.js';
import { sinceTenancy, unitAccess } from '../access.js';
import { buildLedger } from '../rent.js';
import {
  ApiError, int, isPeriod, now, oneOf, str, ymOf,
} from '../util.js';

const METHODS = ['upi', 'cash', 'bank', 'other'];

export async function receiptSig(secret, p) {
  return (await hmacHex(secret, `rcpt:${p.receipt_no}:${p.amount}:${p.period}:${p.unit_id}`)).slice(0, 16);
}

async function loadPayment(ctx, id) {
  const p = await one(ctx.db, 'SELECT * FROM payments WHERE id = ?', id);
  if (!p) throw new ApiError(404, 'not_found', 'Not found');
  const access = await unitAccess(ctx.db, ctx.user, p.unit_id);
  if (!sinceTenancy(access, p.created_at)) throw new ApiError(404, 'not_found', 'Not found');
  return { p, ...access };
}

const payView = (p) => ({
  id: p.id, unit_id: p.unit_id, period: p.period, amount: p.amount, method: p.method, status: p.status, utr: p.utr,
  note: p.note, created_at: p.created_at, decided_at: p.decided_at, receipt_no: p.receipt_no, reject_reason: p.reject_reason,
});

export function register(r) {
  // ---- landlord: month board ----
  r.add('GET', '/rent', async (ctx) => {
    const t = now();
    const cur = ymOf(t);
    const month = ctx.url.searchParams.get('month') || cur;
    if (!isPeriod(month) || month > cur) throw new ApiError(400, 'invalid_input', 'Month is not valid');
    const units = await all(ctx.db,
      `SELECT u.*, p.name AS property_name FROM units u JOIN properties p ON p.id = u.property_id
       WHERE p.owner_id = ? ORDER BY p.name, u.label`, ctx.user.id);
    const pays = await all(ctx.db,
      `SELECT pay.* FROM payments pay JOIN properties p ON p.id = pay.property_id
       WHERE p.owner_id = ? AND pay.status <> 'rejected' ORDER BY pay.created_at`, ctx.user.id);
    const byUnit = new Map();
    for (const p of pays) {
      if (!byUnit.has(p.unit_id)) byUnit.set(p.unit_id, []);
      byUnit.get(p.unit_id).push(p);
    }
    const rows = [];
    const sum = { expected: 0, collected: 0, pending: 0, overdue_count: 0, outstanding: 0 };
    for (const u of units) {
      const mine = byUnit.get(u.id) || [];
      const base = {
        unit_id: u.id, property_id: u.property_id, property_name: u.property_name, label: u.label, rent: u.rent,
        tenant_name: u.tenant_name, tenant_phone: u.tenant_phone, tenant_linked: !!u.tenant_id,
      };
      const occupied = !!(u.tenant_id || u.tenant_name);
      if (!occupied) { rows.push({ ...base, status: 'vacant', paid: 0, pending: 0, claims: [], outstanding: 0 }); continue; }
      const ledger = buildLedger(u, mine, t);
      const row = ledger.rows.find((x) => x.period === month);
      if (!row) { rows.push({ ...base, status: 'na', paid: 0, pending: 0, claims: [], outstanding: ledger.outstanding }); continue; }
      const claims = mine.filter((p) => p.status === 'pending' && p.period === month)
        .map((p) => ({ id: p.id, amount: p.amount, method: p.method, utr: p.utr, created_at: p.created_at }));
      sum.expected += row.expected;
      sum.collected += row.paid;
      sum.pending += row.pending;
      sum.outstanding += ledger.outstanding;
      if (row.status === 'overdue') sum.overdue_count++;
      rows.push({ ...base, status: row.status, paid: row.paid, pending: row.pending, claims, outstanding: ledger.outstanding, due_ts: row.due_ts });
    }
    // Claims for other months also need attention
    const otherClaims = pays.filter((p) => p.status === 'pending' && p.period !== month).length;
    return { month, summary: { ...sum, other_claims: otherClaims }, units: rows };
  });

  // ---- tenant: my rent ----
  r.add('GET', '/my/rent', async (ctx) => {
    const t = now();
    const units = await all(ctx.db,
      `SELECT u.*, p.name AS property_name, p.address, p.upi_id, p.upi_name, o.name AS landlord_name
       FROM units u JOIN properties p ON p.id = u.property_id JOIN users o ON o.id = p.owner_id
       WHERE u.tenant_id = ? ORDER BY p.name, u.label`, ctx.user.id);
    const out = [];
    for (const u of units) {
      const pays = await all(ctx.db, 'SELECT * FROM payments WHERE unit_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 200', u.id, u.tenant_since || 0);
      const ledger = buildLedger(u, pays, t);
      out.push({
        unit: { id: u.id, label: u.label, rent: u.rent, due_day: u.due_day, start_month: u.start_month },
        property: { id: u.property_id, name: u.property_name, address: u.address, upi_id: u.upi_id, upi_name: u.upi_name, landlord: u.landlord_name },
        ledger: { rows: ledger.rows.slice(-12).reverse(), outstanding: ledger.outstanding, oldest: ledger.oldest },
        payments: pays.slice(0, 30).map(payView),
      });
    }
    return { tenancies: out };
  });

  r.add('GET', '/units/:id/payments', async (ctx) => {
    const { unit } = await unitAccess(ctx.db, ctx.user, ctx.params.id, { allow: ['owner'] });
    const pays = await all(ctx.db, 'SELECT * FROM payments WHERE unit_id = ? ORDER BY created_at DESC LIMIT 200', unit.id);
    const ledger = buildLedger(unit, pays, now());
    return { ledger: { rows: ledger.rows.slice(-12).reverse(), outstanding: ledger.outstanding }, payments: pays.slice(0, 50).map(payView) };
  });

  r.add('POST', '/units/:id/payments', async (ctx) => {
    const { unit, property, as } = await unitAccess(ctx.db, ctx.user, ctx.params.id);
    const t = now();
    const cur = ymOf(t);
    const b = ctx.body;
    const period = b.period || cur;
    if (!isPeriod(period) || period > cur || period < unit.start_month) throw new ApiError(400, 'invalid_input', 'Choose a month between the lease start and this month.');
    const amount = int(b.amount, { min: 1, max: 10_000_000, name: 'amount' });
    const method = oneOf(b.method || 'upi', METHODS, 'method');
    const utr = str(b.utr, { max: 30, name: 'UTR' });
    const note = str(b.note, { max: 140, name: 'note' });
    const id = randomId(14);

    if (as === 'tenant') {
      await rateLimit(ctx.db, `claim:${ctx.user.id}`, 20, 3600);
      const open = await one(ctx.db, "SELECT COUNT(*) AS n FROM payments WHERE unit_id = ? AND status = 'pending'", unit.id);
      if (open.n >= 10) throw new ApiError(400, 'limit', 'You already have several payments waiting for confirmation.');
      await run(ctx.db,
        `INSERT INTO payments (id, unit_id, property_id, period, amount, method, status, utr, note, created_by, created_at, tenant_name)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        id, unit.id, property.id, period, amount, method, utr, note, ctx.user.id, t, unit.tenant_name);
      await notify(ctx.db, property.owner_id, 'rent_claim',
        { unit: unit.label, property: property.name, amount, period, method, who: ctx.user.name }, id);
      return { id, status: 'pending' };
    }
    // landlord records a payment they already received
    const receipt_no = `PO-${randomCode(8)}`;
    await run(ctx.db,
      `INSERT INTO payments (id, unit_id, property_id, period, amount, method, status, utr, note, created_by, created_at, decided_by, decided_at, receipt_no, tenant_name)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, unit.id, property.id, period, amount, method, utr, note, ctx.user.id, t, ctx.user.id, t, receipt_no, unit.tenant_name);
    if (unit.tenant_id) await notify(ctx.db, unit.tenant_id, 'rent_confirmed', { unit: unit.label, property: property.name, amount, period, receipt_no }, id);
    return { id, status: 'confirmed', receipt_no };
  });

  r.add('POST', '/payments/:id/confirm', async (ctx) => {
    const { p, unit, property, as } = await loadPayment(ctx, ctx.params.id);
    if (as !== 'owner') throw new ApiError(403, 'forbidden', 'Only the landlord can confirm payments.');
    if (p.status !== 'pending') throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    const t = now();
    const receipt_no = `PO-${randomCode(8)}`;
    const res = await run(ctx.db, "UPDATE payments SET status = 'confirmed', decided_by = ?, decided_at = ?, receipt_no = ? WHERE id = ? AND status = 'pending'", ctx.user.id, t, receipt_no, p.id);
    if (res.meta && res.meta.changes === 0) throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    if (unit.tenant_id) await notify(ctx.db, unit.tenant_id, 'rent_confirmed', { unit: unit.label, property: property.name, amount: p.amount, period: p.period, receipt_no }, p.id);
    return { receipt_no };
  });

  r.add('POST', '/payments/:id/reject', async (ctx) => {
    const { p, unit, property, as } = await loadPayment(ctx, ctx.params.id);
    if (as !== 'owner') throw new ApiError(403, 'forbidden', 'Only the landlord can reject payments.');
    if (p.status !== 'pending') throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    const reason = str(ctx.body.reason, { max: 140, name: 'reason' });
    const res = await run(ctx.db, "UPDATE payments SET status = 'rejected', decided_by = ?, decided_at = ?, reject_reason = ? WHERE id = ? AND status = 'pending'", ctx.user.id, now(), reason, p.id);
    if (res.meta && res.meta.changes === 0) throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    if (unit.tenant_id) await notify(ctx.db, unit.tenant_id, 'rent_rejected', { unit: unit.label, property: property.name, amount: p.amount, period: p.period, reason }, p.id);
    return {};
  });

  r.add('POST', '/payments/:id/cancel', async (ctx) => {
    const { p, as } = await loadPayment(ctx, ctx.params.id);
    if (as !== 'tenant' || p.created_by !== ctx.user.id) throw new ApiError(403, 'forbidden', 'Only the person who sent it can withdraw it.');
    if (p.status !== 'pending') throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    const res = await run(ctx.db, "DELETE FROM payments WHERE id = ? AND status = 'pending'", p.id);
    if (res.meta && res.meta.changes === 0) throw new ApiError(409, 'bad_state', 'This payment was already handled.');
    return {};
  });

  r.add('GET', '/payments/:id/receipt', async (ctx) => {
    const { p, unit, property } = await loadPayment(ctx, ctx.params.id);
    if (p.status !== 'confirmed' || !p.receipt_no) throw new ApiError(400, 'bad_state', 'This payment has no receipt yet.');
    const sig = await receiptSig(ctx.secret, p);
    return {
      receipt_no: p.receipt_no, sig, amount: p.amount, period: p.period, method: p.method, utr: p.utr, paid_on: p.decided_at,
      unit: unit.label, property: property.name, address: property.address, tenant: p.tenant_name || unit.tenant_name,
      landlord: (await one(ctx.db, 'SELECT name FROM users WHERE id = ?', property.owner_id))?.name || '',
      verify_url: `${ctx.origin}/#/verify/${p.receipt_no}.${sig}`,
    };
  });

  r.add('GET', '/receipts/verify', async (ctx) => {
    await rateLimit(ctx.db, `verify:${ctx.ip}`, 60, 3600);
    const no = str(ctx.url.searchParams.get('no'), { min: 4, max: 20, name: 'receipt' });
    const sig = str(ctx.url.searchParams.get('sig'), { min: 4, max: 40, name: 'signature' });
    const p = await one(ctx.db, "SELECT * FROM payments WHERE receipt_no = ? AND status = 'confirmed'", no);
    if (!p || !safeEqual(await receiptSig(ctx.secret, p), sig)) return { valid: false };
    const unit = await one(ctx.db, 'SELECT label FROM units WHERE id = ?', p.unit_id);
    const prop = await one(ctx.db, 'SELECT name FROM properties WHERE id = ?', p.property_id);
    return { valid: true, receipt_no: p.receipt_no, amount: p.amount, period: p.period, paid_on: p.decided_at, unit: unit?.label || '', property: prop?.name || '' };
  }, { auth: false });
}
