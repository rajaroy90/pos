// Regression tests for the security / privacy review fixes. Own database, own process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../server/app.js';
import { createD1 } from '../dev/d1-shim.js';

const env = { DB: createD1(), APP_SECRET: 'review-secret-review-secret-1234' };
const ORIGIN = 'http://localhost:8788';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ipSeq = 0;
class Client {
  constructor() { this.cookie = ''; this.ip = `10.0.0.${++ipSeq}`; }
  async call(method, path, body, { raw = false } = {}) {
    const h = { 'x-po': '1', origin: ORIGIN, 'x-forwarded-for': this.ip };
    if (this.cookie) h.cookie = this.cookie;
    const init = { method, headers: h };
    if (body !== undefined) { init.body = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const res = await handle(new Request(ORIGIN + '/api' + path, init), env);
    for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [k, v] = c.split(';')[0].split('=');
      this.cookie = /Max-Age=0/i.test(c) ? '' : `${k}=${v}`;
    }
    if (raw) return res;
    const data = await res.json();
    return { ...data, st: data.status, status: res.status };
  }
  get(p) { return this.call('GET', p); }
  post(p, b = {}) { return this.call('POST', p, b); }
  patch(p, b = {}) { return this.call('PATCH', p, b); }
}

const key = (c) => Buffer.from(c).toString('hex').repeat(64).slice(0, 64);
const shift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const thisMonth = () => new Date(Date.now() + 19800_000).toISOString().slice(0, 7);

async function signup(email, name, k, extra = {}) {
  const c = new Client();
  const r = await c.post('/auth/signup', { email, name, authKey: key(k), consent: true, ...extra });
  assert.equal(r.status, 200, `signup ${email}: ${JSON.stringify(r)}`);
  return c;
}

const L = await signup('owner@example.com', 'Olive Owner', 'a', { role: 'landlord' });
const prop = await L.post('/properties', { name: 'Test Court', upi_id: 'olive@okaxis', upi_name: 'Olive' });
const mkUnit = async (label, extra = {}) => (await L.post(`/properties/${prop.id}/units`, { label, rent: 10000, due_day: 5, start_month: shift(thisMonth(), -2), ...extra })).id;
const invite = async (unit) => (await L.post(`/units/${unit}/invite`)).code;

test('a new tenant never sees the previous tenancy; the landlord keeps the records', async () => {
  const unit = await mkUnit('P1');
  const T1 = await signup('t1@example.com', 'First Tenant', 'b', { inviteCode: await invite(unit) });
  const claim = await T1.post(`/units/${unit}/payments`, { period: thisMonth(), amount: 10000, method: 'cash', note: 'private note' });
  assert.equal(claim.status, 200);
  await L.post(`/payments/${claim.id}/confirm`);
  const ticket = await T1.post('/tickets', { unit_id: unit, title: 'Old fan noise', category: 'electrical' });
  assert.equal(ticket.status, 200);
  assert.equal((await T1.get('/tickets')).tickets.length, 1);

  assert.equal((await L.post(`/units/${unit}/vacate`)).status, 200);
  // The old tenant is out completely.
  assert.equal((await T1.get(`/tickets/${ticket.id}`)).status, 404);
  assert.equal((await T1.get(`/payments/${claim.id}/receipt`)).status, 404);
  assert.equal((await T1.get('/my/rent')).tenancies.length, 0);

  await sleep(1100); // the new tenancy starts a moment after the old one ended
  const T2 = await signup('t2@example.com', 'Second Tenant', 'c', { inviteCode: await invite(unit) });
  const mine = await T2.get('/my/rent');
  assert.equal(mine.tenancies.length, 1);
  assert.equal(mine.tenancies[0].payments.length, 0);
  assert.equal((await T2.get('/tickets')).tickets.length, 0);
  assert.equal((await T2.get(`/tickets/${ticket.id}`)).status, 404);
  assert.equal((await T2.get(`/payments/${claim.id}/receipt`)).status, 404);
  // Whatever the new tenant does is visible to them.
  const t = await T2.post('/tickets', { unit_id: unit, title: 'New tap issue', category: 'plumbing' });
  assert.equal((await T2.get('/tickets')).tickets.length, 1);
  assert.equal((await T2.get(`/tickets/${t.id}`)).status, 200);
  // The landlord still sees the full history.
  const hist = await L.get(`/units/${unit}/payments`);
  assert.ok(hist.payments.some((p) => p.id === claim.id));
  assert.ok((await L.get('/tickets')).tickets.some((x) => x.id === ticket.id));
  // And the receipt still verifies publicly, with the name the payer had at the time.
  const rc = await L.get(`/payments/${claim.id}/receipt`);
  assert.equal(rc.tenant, 'First Tenant');
  assert.equal((await new Client().get(`/receipts/verify?no=${rc.receipt_no}&sig=${rc.sig}`)).valid, true);
});

test('rent change applies from a chosen month; earlier months keep the old rent', async () => {
  const cur = thisMonth();
  const unit = await mkUnit('R1', { tenant_name: 'Walk Tenant', start_month: shift(cur, -3) });
  let r = await L.patch(`/units/${unit}`, { rent: 12000, rent_from: shift(cur, -1) });
  assert.equal(r.status, 200);
  const led = (await L.get(`/units/${unit}/payments`)).ledger;
  const by = Object.fromEntries(led.rows.map((x) => [x.period, x.expected]));
  assert.equal(by[shift(cur, -3)], 10000);
  assert.equal(by[shift(cur, -2)], 10000);
  assert.equal(by[shift(cur, -1)], 12000);
  assert.equal(by[cur], 12000);
  assert.equal(led.outstanding, 10000 + 10000 + 12000 + 12000);

  // Portfolio charts use the month-specific expected amount, including property filters.
  const oldBoard = await L.get(`/rent?month=${shift(cur, -2)}`);
  const currentBoard = await L.get(`/rent?month=${cur}`);
  assert.equal(oldBoard.units.find(u => u.unit_id === unit).expected, 10000);
  assert.equal(currentBoard.units.find(u => u.unit_id === unit).expected, 12000);

  // A later change applies from its own month; the month before keeps what was agreed then.
  r = await L.patch(`/units/${unit}`, { rent: 15000, rent_from: cur });
  assert.equal(r.status, 200);
  const by2 = Object.fromEntries((await L.get(`/units/${unit}/payments`)).ledger.rows.map((x) => [x.period, x.expected]));
  assert.equal(by2[shift(cur, -3)], 10000);
  assert.equal(by2[shift(cur, -1)], 12000);
  assert.equal(by2[cur], 15000);

  // A request to go back before the previous change is pulled forward, so earlier prices stay put.
  r = await L.patch(`/units/${unit}`, { rent: 9000, rent_from: shift(cur, -3) });
  assert.equal(r.status, 200);
  const by4 = Object.fromEntries((await L.get(`/units/${unit}/payments`)).ledger.rows.map((x) => [x.period, x.expected]));
  assert.equal(by4[shift(cur, -3)], 10000);
  assert.equal(by4[shift(cur, -2)], 10000);
  assert.equal(by4[shift(cur, -1)], 12000);
  assert.equal(by4[cur], 9000);

  // Default: a change with no month starts next month, so this month stays as agreed.
  const u2 = await mkUnit('R2', { tenant_name: 'Other Tenant', start_month: shift(cur, -1) });
  await L.patch(`/units/${u2}`, { rent: 11000 });
  const by3 = Object.fromEntries((await L.get(`/units/${u2}/payments`)).ledger.rows.map((x) => [x.period, x.expected]));
  assert.equal(by3[cur], 10000);
  // Vacating clears the history for the next tenant.
  await L.post(`/units/${u2}/vacate`);
  assert.equal(env.DB._raw.prepare('SELECT rent_hist AS h FROM units WHERE id = ?').get(u2).h, '[]');
});

test('rate limiting holds under parallel attempts', async () => {
  const c = new Client();
  const res = await Promise.all(Array.from({ length: 30 }, () => c.post('/auth/login', { email: 'victim@example.com', authKey: key('f') })));
  const codes = res.map((r) => r.status);
  assert.equal(codes.filter((s) => s === 401).length, 8, JSON.stringify(codes));
  assert.equal(codes.filter((s) => s === 429).length, 22);
  // A different address is not locked out by that, but the account-wide cap still exists.
  const other = new Client();
  assert.equal((await other.post('/auth/login', { email: 'victim@example.com', authKey: key('f') })).status, 401);
});

test('an invite can be used by exactly one person, even when two submit it at once', async () => {
  const unit = await mkUnit('I1');
  const code = await invite(unit);
  const a = await signup('ia@example.com', 'Aaa Person', 'd');
  const b = await signup('ib@example.com', 'Bbb Person', 'e');
  const [ra, rb] = await Promise.all([a.post('/join', { code }), b.post('/join', { code })]);
  const ok = [ra, rb].filter((r) => r.status === 200);
  assert.equal(ok.length, 1, JSON.stringify([ra, rb]));
  const owner = env.DB._raw.prepare('SELECT tenant_id AS t FROM units WHERE id = ?').get(unit).t;
  assert.ok(owner);
  // A guard invite is also single-use.
  const g = (await L.post(`/properties/${prop.id}/guard-invite`)).code;
  const [g1, g2] = await Promise.all([a.post('/join', { code: g }), b.post('/join', { code: g })]);
  assert.equal([g1, g2].filter((r) => r.status === 200).length, 1);
});

test('demo accounts cannot join real invites or change real accounts', async () => {
  const unit = await mkUnit('D1');
  const code = await invite(unit);
  const D = new Client();
  assert.equal((await D.post('/demo/start', { role: 'tenant' })).status, 200);
  const r = await D.post('/join', { code });
  assert.equal(r.status, 403);
  assert.equal(r.error, 'demo_blocked');
  assert.equal((await D.post('/me/password', { authKey: key('a'), newKey: key('b') })).status, 403);
  assert.equal(env.DB._raw.prepare('SELECT tenant_id AS t FROM units WHERE id = ?').get(unit).t, null);
  // The invite is still good for a real person.
  const real = await signup('after-demo@example.com', 'Real Person', 'g');
  assert.equal((await real.post('/join', { code })).status, 200);
});

test('a landlord reset code is revoked by a password change and expires with 2+ tenancies', async () => {
  const unit = await mkUnit('A1');
  const T = await signup('assist@example.com', 'Assisted Tenant', 'h', { inviteCode: await invite(unit) });
  // 1. changing the password kills any outstanding code
  const code1 = (await L.post(`/units/${unit}/reset-code`)).code;
  assert.equal((await T.post('/me/password', { authKey: key('h'), newKey: key('i') })).status, 200);
  const X1 = new Client();
  assert.equal((await X1.post('/auth/reset', { email: 'assist@example.com', code: code1, authKey: key('j') })).status, 400);
  // 2. a code stops working once the account is attached to anything else
  const code2 = (await L.post(`/units/${unit}/reset-code`)).code;
  const unit2 = await mkUnit('A2');
  assert.equal((await T.post('/join', { code: await invite(unit2) })).status, 200);
  const X2 = new Client();
  assert.equal((await X2.post('/auth/reset', { email: 'assist@example.com', code: code2, authKey: key('j') })).status, 400);
  assert.equal((await L.post(`/units/${unit}/reset-code`)).status, 403);
  // 3. a normal use of a code tells the account holder
  const solo = await mkUnit('A3');
  const S = await signup('solo@example.com', 'Solo Tenant', 'k', { inviteCode: await invite(solo) });
  const code3 = (await L.post(`/units/${solo}/reset-code`)).code;
  const Y = new Client();
  assert.equal((await Y.post('/auth/reset', { email: 'solo@example.com', code: code3, authKey: key('l') })).status, 200);
  assert.ok((await Y.get('/notifications')).items.some((n) => n.kind === 'password_reset'));
  assert.equal((await S.get('/me')).status, 401);
});

test('deleting an account removes what it raised and anonymises what the landlord keeps', async () => {
  const unit = await mkUnit('X1');
  const T = await signup('gone@example.com', 'Gone Tenant', 'm', { inviteCode: await invite(unit) });
  const pay = await T.post(`/units/${unit}/payments`, { period: thisMonth(), amount: 10000, method: 'upi', utr: '999988887777', note: 'for the month' });
  await L.post(`/payments/${pay.id}/confirm`);
  const tk = await T.post('/tickets', { unit_id: unit, title: 'Window stuck', category: 'structure' });
  const vis = await T.post('/visitors', { unit_id: unit, name: 'Cousin Sam', hours: 3 });
  assert.equal(vis.status, 200);
  assert.equal((await T.post('/me/delete', { authKey: key('m') })).status, 200);

  const raw = env.DB._raw;
  const u = raw.prepare('SELECT tenant_id, tenant_name, tenant_phone FROM units WHERE id = ?').get(unit);
  assert.equal(u.tenant_id, null);
  assert.equal(u.tenant_name, '');
  const p = raw.prepare('SELECT tenant_name, note, status FROM payments WHERE id = ?').get(pay.id);
  assert.equal(p.status, 'confirmed'); // the landlord keeps the rent record
  assert.equal(p.tenant_name, '');
  assert.equal(p.note, '');
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM tickets WHERE id = ?').get(tk.id).n, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM ticket_events WHERE ticket_id = ?').get(tk.id).n, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM visitors WHERE unit_id = ?').get(unit).n, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM rl WHERE instr(key, ?) > 0').get('gone@example.com').n, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get('gone@example.com').n, 0);
  // The next tenant starts clean.
  await sleep(1100);
  const N = await signup('next@example.com', 'Next Tenant', 'n', { inviteCode: await invite(unit) });
  assert.equal((await N.get('/my/rent')).tenancies[0].payments.length, 0);
});

test('confirming and rejecting the same claim at once: only one wins', async () => {
  const unit = await mkUnit('C1');
  const T = await signup('race@example.com', 'Race Tenant', 'o', { inviteCode: await invite(unit) });
  const claim = await T.post(`/units/${unit}/payments`, { period: thisMonth(), amount: 10000, method: 'cash' });
  const [a, b] = await Promise.all([L.post(`/payments/${claim.id}/confirm`), L.post(`/payments/${claim.id}/reject`, { reason: 'No' })]);
  const codes = [a.status, b.status].sort();
  assert.deepEqual(codes, [200, 409], JSON.stringify([a, b]));
  const row = env.DB._raw.prepare('SELECT status, receipt_no FROM payments WHERE id = ?').get(claim.id);
  assert.ok(row.status === 'confirmed' ? !!row.receipt_no : !row.receipt_no);
  // The tenant cannot cancel a decided claim.
  assert.equal((await T.post(`/payments/${claim.id}/cancel`)).status, 409);
});

test('photo cap per flat and wrong-property scans leave no names behind', async () => {
  const unit = await mkUnit('F1');
  const T = await signup('photos@example.com', 'Photo Tenant', 'p', { inviteCode: await invite(unit) });
  const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////';
  // Tickets are rate limited per person, so fill the flat's photo allowance directly, then try one more.
  const me = (await T.get('/me')).user;
  const ins = env.DB._raw.prepare(
    "INSERT INTO tickets (id, property_id, unit_id, created_by, title, description, category, urgency, status, has_photo, created_at, updated_at) VALUES (?, ?, ?, ?, 'Seeded', '', 'other', 'normal', 'open', 1, 1, 1)");
  for (let i = 0; i < 40; i++) ins.run(`seed${i}`, prop.id, unit, me.id);
  const last = await T.post('/tickets', { unit_id: unit, title: 'One photo too many', photo });
  assert.equal(last.status, 400);
  assert.equal(last.error, 'limit');
  assert.equal(env.DB._raw.prepare('SELECT COUNT(*) AS n FROM tickets WHERE unit_id = ?').get(unit).n, 40);
  // Without a photo the request still goes through.
  assert.equal((await T.post('/tickets', { unit_id: unit, title: 'No photo this time' })).status, 200);

  // A pass for another property is refused, and the guard's log carries no visitor name or id.
  const other = await L.post('/properties', { name: 'Other Court' });
  const G = await signup('guard2@example.com', 'Other Guard', 'q', { inviteCode: (await L.post(`/properties/${other.id}/guard-invite`)).code });
  const pass = await T.post('/visitors', { unit_id: unit, name: 'Secret Visitor', hours: 2 });
  const v = await G.post('/guard/verify', { property_id: other.id, token: pass.visitor.token });
  assert.equal(v.result, 'wrong_property');
  assert.ok(!JSON.stringify(v).includes('Secret Visitor'));
  const logs = env.DB._raw.prepare('SELECT * FROM visit_log WHERE property_id = ?').all(other.id);
  assert.ok(logs.length >= 1);
  for (const l of logs) {
    assert.ok(!JSON.stringify(l).includes('Secret Visitor'));
    assert.ok(!l.visitor_id);
  }
});

test('malformed URL encoding is a 404, not a crash', async () => {
  const c = new Client();
  const res = await c.call('GET', '/tickets/%E0%A4%A', undefined, { raw: true });
  assert.ok([401, 404].includes(res.status), String(res.status));
  const res2 = await L.call('GET', '/tickets/%E0%A4%A', undefined, { raw: true });
  assert.equal(res2.status, 404);
});

test('housekeeping removes stale rows and keeps fresh ones', async () => {
  const { prune } = await import('../server/db.js');
  const raw = env.DB._raw;
  const t = Math.floor(Date.now() / 1000);
  raw.prepare('INSERT INTO rl (key, window_start, count) VALUES (?, ?, 1)').run('old-key', t - 3 * 86400);
  raw.prepare('INSERT INTO rl (key, window_start, count) VALUES (?, ?, 1)').run('new-key', t);
  await prune(env.DB);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM rl WHERE key = 'old-key'").get().n, 0);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM rl WHERE key = 'new-key'").get().n, 1);
});

test('portfolio attention counts pending claims from earlier months by property', async () => {
  const unit = await mkUnit('Attention');
  const tenant = await signup('attention@example.com', 'Attention Tenant', 'z', { inviteCode: await invite(unit) });
  const before = (await L.get('/rent')).summary;
  const claim = await tenant.post(`/units/${unit}/payments`, { period: shift(thisMonth(), -1), amount: 500, method: 'cash' });
  assert.equal(claim.status, 200);
  const after = (await L.get('/rent')).summary;
  assert.equal(after.other_claims, before.other_claims + 1);
  assert.equal(after.other_claims_by_property[prop.id], (before.other_claims_by_property[prop.id] || 0) + 1);
});
