import { dueEnd, monthsBetween, ymOf } from './util.js';

/** Rent that applied in a given month. Earlier rents are kept in rent_hist: [{ upto: 'YYYY-MM', rent }]. */
export function rentFor(unit, period) {
  let hist = [];
  try { hist = JSON.parse(unit.rent_hist || '[]'); } catch { hist = []; }
  for (const h of hist) if (period <= h.upto) return h.rent;
  return unit.rent;
}

/**
 * Build the month-by-month ledger for one unit.
 * payments: rows of { period, amount, status } (status: pending | confirmed | rejected)
 * Only confirmed payments count as paid. Pending claims are shown separately.
 */
export function buildLedger(unit, payments, nowTs) {
  const cur = ymOf(nowTs);
  const rows = [];
  if (!unit.tenant_id && !unit.tenant_name) return { rows, outstanding: 0, oldest: null };
  if (unit.start_month > cur) return { rows, outstanding: 0, oldest: null };

  for (const period of monthsBetween(unit.start_month, cur)) {
    const mine = payments.filter((p) => p.period === period);
    const paid = mine.filter((p) => p.status === 'confirmed').reduce((a, p) => a + p.amount, 0);
    const pending = mine.filter((p) => p.status === 'pending').reduce((a, p) => a + p.amount, 0);
    const expected = rentFor(unit, period);
    const due_ts = dueEnd(period, unit.due_day);
    let status;
    if (paid >= expected) status = 'paid';
    else if (nowTs > due_ts) status = 'overdue';
    else status = paid > 0 ? 'partial' : 'due';
    rows.push({ period, expected, paid, pending, balance: Math.max(0, expected - paid), due_ts, status });
  }
  const unpaid = rows.filter((r) => r.balance > 0);
  return {
    rows,
    outstanding: unpaid.reduce((a, r) => a + r.balance, 0),
    oldest: unpaid.length ? unpaid[0] : null,
  };
}
