import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../server/app.js';
import { createD1 } from '../dev/d1-shim.js';

const env = { DB: createD1(), APP_SECRET: 'test-secret-test-secret-123456' };
const ORIGIN = 'http://localhost:8788';

class Client {
  constructor(name = '?') { this.cookie = ''; this.name = name; }
  async call(method, path, body, { headers = {}, raw = false } = {}) {
    const h = { 'x-po': '1', origin: ORIGIN, ...headers };
    if (this.cookie) h.cookie = this.cookie;
    const init = { method, headers: h };
    if (body !== undefined) { init.body = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const res = await handle(new Request(ORIGIN + '/api' + path, init), env);
    const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of sc) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (/Max-Age=0/i.test(c)) this.cookie = ''; else this.cookie = `${k}=${v}`;
    }
    if (raw) return res;
    const data = await res.json();
    return { ...data, st: data.status, status: res.status };
  }
  get(p) { return this.call('GET', p); }
  post(p, b = {}) { return this.call('POST', p, b); }
  patch(p, b = {}) { return this.call('PATCH', p, b); }
  del(p) { return this.call('DELETE', p); }
}

const key = (c) => c.repeat(64).slice(0, 64);
const thisMonth = () => new Date(Date.now() + 19800_000).toISOString().slice(0, 7);

const L = new Client('landlord');
const T = new Client('tenant');
const G = new Client('guard');
const X = new Client('stranger');
let propertyId; let unitId; let unit2; let inviteCode; let guardCode;

test('health + config errors', async () => {
  const a = new Client();
  const r = await a.get('/health');
  assert.equal(r.ok, true);
  const bad = await handle(new Request(ORIGIN + '/api/health'), { DB: env.DB });
  assert.equal(bad.status, 500);
});

test('csrf: mutating requests need the custom header and same origin', async () => {
  const a = new Client();
  const res = await handle(new Request(ORIGIN + '/api/auth/login', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }), env);
  assert.equal(res.status, 403);
  const res2 = await handle(new Request(ORIGIN + '/api/auth/login', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'x-po': '1', origin: 'https://evil.example' } }), env);
  assert.equal(res2.status, 403);
});

test('signup requires consent, valid key, unique email', async () => {
  let r = await L.post('/auth/signup', { email: 'meera@example.com', name: 'Meera K', authKey: key('a'), role: 'landlord' });
  assert.equal(r.error, 'consent_required');
  r = await L.post('/auth/signup', { email: 'meera@example.com', name: 'Meera K', authKey: 'short', role: 'landlord', consent: true });
  assert.equal(r.status, 400);
  r = await L.post('/auth/signup', { email: 'meera@example.com', name: 'Meera K', authKey: key('a'), role: 'landlord', consent: true, phone: '9876543210' });
  assert.equal(r.status, 200);
  assert.match(r.recovery, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  const me = await L.get('/me');
  assert.equal(me.user.phone, '+919876543210');
  assert.deepEqual(me.roles, ['landlord']);
  const dup = await new Client().post('/auth/signup', { email: 'MEERA@example.com', name: 'X Y', authKey: key('b'), consent: true });
  assert.equal(dup.error, 'email_taken');
});

test('login: wrong password fails generically, right password works, logout clears', async () => {
  const c = new Client();
  let r = await c.post('/auth/login', { email: 'meera@example.com', authKey: key('f') });
  assert.equal(r.status, 401);
  r = await c.post('/auth/login', { email: 'nobody@example.com', authKey: key('f') });
  assert.equal(r.status, 401);
  assert.equal(r.error, 'bad_login');
  r = await c.post('/auth/login', { email: 'meera@example.com', authKey: key('a') });
  assert.equal(r.status, 200);
  assert.equal((await c.get('/me')).status, 200);
  await c.post('/auth/logout');
  assert.equal((await c.get('/me')).status, 401);
});

test('unauthenticated access is rejected on protected routes', async () => {
  const c = new Client();
  for (const p of ['/me', '/properties', '/rent', '/tickets', '/visitors', '/notifications', '/my/rent']) {
    assert.equal((await c.get(p)).status, 401, p);
  }
});

test('landlord sets up property, units, invites', async () => {
  let r = await L.post('/properties', { name: 'Green Villa', address: '12 MG Road', city: 'Bengaluru', upi_id: 'bad id', upi_name: 'Meera' });
  assert.equal(r.status, 400);
  r = await L.post('/properties', { name: 'Green Villa', address: '12 MG Road', city: 'Bengaluru', upi_id: 'meera@okaxis', upi_name: 'Meera K' });
  assert.equal(r.status, 200);
  propertyId = r.id;
  r = await L.post(`/properties/${propertyId}/units`, { label: 'A1', rent: 15000, deposit: 30000, due_day: 5, start_month: '2026-07', tenant_name: 'Ravi', tenant_phone: '9000000001' });
  assert.equal(r.status, 200);
  unitId = r.id;
  r = await L.post(`/properties/${propertyId}/units`, { label: 'A1', rent: 1 });
  assert.equal(r.status, 409);
  r = await L.post(`/properties/${propertyId}/units`, { label: 'A2', rent: 20000 });
  unit2 = r.id;
  r = await L.post(`/units/${unitId}/invite`);
  inviteCode = r.code;
  assert.match(inviteCode, /^[0-9A-Z]{8}$/);
  r = await L.post(`/properties/${propertyId}/guard-invite`);
  guardCode = r.code;
  const list = await L.get('/properties');
  assert.equal(list.properties[0].units.length, 2);
});

test('tenant joins via invite at signup; invite is single-use', async () => {
  const peek = await new Client().get(`/invite/peek?code=${inviteCode}`);
  assert.equal(peek.property, 'Green Villa');
  let r = await T.post('/auth/signup', { email: 'ravi@example.com', name: 'Ravi S', authKey: key('c'), consent: true, inviteCode });
  assert.equal(r.status, 200);
  const me = await T.get('/me');
  assert.deepEqual(me.roles, ['tenant']);
  assert.equal(me.tenancies[0].label, 'A1');
  r = await X.post('/auth/signup', { email: 'x@example.com', name: 'Xavier', authKey: key('d'), consent: true, inviteCode });
  assert.equal(r.error, 'invite_invalid');
  const mine = await L.get('/notifications');
  assert.ok(mine.items.some((n) => n.kind === 'tenant_joined'));
  r = await X.post('/auth/signup', { email: 'x@example.com', name: 'Xavier', authKey: key('d'), consent: true });
  assert.equal(r.status, 200);
});

test('rent: ledger, tenant claim, landlord confirm, receipt, verify', async () => {
  let r = await T.get('/my/rent');
  const t0 = r.tenancies[0];
  assert.ok(t0.ledger.rows.length >= 4);
  assert.equal(t0.ledger.outstanding, 15000 * t0.ledger.rows.length);
  assert.equal(t0.property.upi_id, 'meera@okaxis');

  r = await T.post(`/units/${unitId}/payments`, { period: '2026-07', amount: 15000, method: 'upi', utr: '123456789012' });
  assert.equal(r.status, 200);
  assert.equal(r.status, 200);
  const claimId = r.id;
  let board = await L.get('/rent?month=2026-07');
  const row = board.units.find((u) => u.unit_id === unitId);
  assert.equal(row.pending, 15000);
  assert.equal(row.paid, 0);
  assert.equal(row.claims[0].utr, '123456789012');
  assert.ok(board.units.find((u) => u.unit_id === unit2).status === 'vacant');

  // stranger and tenant cannot confirm
  assert.equal((await X.post(`/payments/${claimId}/confirm`)).status, 404);
  assert.equal((await T.post(`/payments/${claimId}/confirm`)).status, 403);

  r = await L.post(`/payments/${claimId}/confirm`);
  assert.match(r.receipt_no, /^PO-[0-9A-Z]{8}$/);
  assert.equal((await L.post(`/payments/${claimId}/confirm`)).status, 409);

  board = await L.get('/rent?month=2026-07');
  assert.equal(board.units.find((u) => u.unit_id === unitId).status, 'paid');

  const rc = await T.get(`/payments/${claimId}/receipt`);
  assert.equal(rc.amount, 15000);
  const v = await new Client().get(`/receipts/verify?no=${rc.receipt_no}&sig=${rc.sig}`);
  assert.equal(v.valid, true);
  const bad = await new Client().get(`/receipts/verify?no=${rc.receipt_no}&sig=0000000000000000`);
  assert.equal(bad.valid, false);
  assert.equal((await X.get(`/payments/${claimId}/receipt`)).status, 404);

  const notes = await T.get('/notifications');
  assert.ok(notes.items.some((n) => n.kind === 'rent_confirmed'));
});

test('rent: landlord records cash, partial status, reject, bad periods', async () => {
  let r = await L.post(`/units/${unitId}/payments`, { period: '2026-08', amount: 5000, method: 'cash' });
  assert.equal(r.status, 200);
  assert.ok(r.receipt_no);
  let board = await L.get('/rent?month=2026-08');
  const row = board.units.find((u) => u.unit_id === unitId);
  assert.equal(row.paid, 5000);
  assert.ok(['partial', 'overdue'].includes(row.status));
  assert.equal((await T.post(`/units/${unitId}/payments`, { period: '2026-01', amount: 100, method: 'upi' })).status, 400);
  assert.equal((await T.post(`/units/${unitId}/payments`, { period: '2999-01', amount: 100, method: 'upi' })).status, 400);
  assert.equal((await T.post(`/units/${unitId}/payments`, { period: '2026-08', amount: -5, method: 'upi' })).status, 400);
  assert.equal((await T.post(`/units/${unitId}/payments`, { period: '2026-08', amount: 100, method: 'bitcoin' })).status, 400);
  r = await T.post(`/units/${unitId}/payments`, { period: '2026-09', amount: 15000, method: 'cash' });
  const rej = await L.post(`/payments/${r.id}/reject`, { reason: 'Not received' });
  assert.equal(rej.status, 200);
  const my = await T.get('/my/rent');
  assert.equal(my.tenancies[0].payments.find((p) => p.id === r.id).status, 'rejected');
  r = await T.post(`/units/${unitId}/payments`, { period: '2026-09', amount: 100, method: 'upi' });
  assert.equal((await T.post(`/payments/${r.id}/cancel`)).status, 200);
  assert.equal((await X.post(`/units/${unitId}/payments`, { period: '2026-08', amount: 100, method: 'upi' })).status, 404);
});

test('tickets: create, comment, assign, resolve, tenant confirms; permissions hold', async () => {
  const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////';
  let r = await T.post('/tickets', { unit_id: unitId, title: 'Tap leaking', description: 'Kitchen sink', category: 'plumbing', urgency: 'urgent', photo });
  assert.equal(r.status, 200);
  const id = r.id;
  assert.equal((await X.get(`/tickets/${id}`)).status, 404);
  assert.equal((await T.post('/tickets', { unit_id: unitId, title: 'x', category: 'plumbing' })).status, 400);
  assert.equal((await T.post('/tickets', { unit_id: unitId, title: 'Tap leak', photo: 'data:text/html;base64,AAAA' })).status, 400);
  let t = await L.get(`/tickets/${id}`);
  assert.equal(t.ticket.photo, photo);
  assert.equal(t.tenant.name, 'Ravi S');
  assert.ok((await L.get('/notifications')).items.some((n) => n.kind === 'ticket_new'));
  assert.equal((await T.post(`/tickets/${id}/events`, { kind: 'assign', vendor_name: 'Me' })).status, 403);
  assert.equal((await T.post(`/tickets/${id}/events`, { kind: 'status', status: 'closed' })).status, 403);
  r = await L.post(`/tickets/${id}/events`, { kind: 'assign', vendor_name: 'Mahesh', vendor_phone: '9811111111' });
  assert.equal(r.st, 'assigned');
  assert.equal((await T.post(`/tickets/${id}/events`, { kind: 'comment', text: 'Please come after 5pm' })).status, 200);
  await L.post(`/tickets/${id}/events`, { kind: 'status', status: 'resolved', text: 'Washer replaced' });
  r = await T.post(`/tickets/${id}/events`, { kind: 'status', status: 'closed' });
  assert.equal(r.st, 'closed');
  t = await T.get(`/tickets/${id}`);
  assert.ok(t.events.length >= 5);
  assert.equal(t.tenant, null);
  const list = await T.get('/tickets');
  assert.equal(list.tickets[0].as, 'tenant');
});

test('visitors: pass, guard scan, reuse blocked, code entry, walk-in approval', async () => {
  let r = await G.post('/auth/signup', { email: 'gate@example.com', name: 'Gate Guy', authKey: key('e'), consent: true, inviteCode: guardCode });
  assert.equal(r.status, 200);
  const gme = await G.get('/me');
  assert.deepEqual(gme.roles, ['guard']);
  const pid = gme.guard_properties[0].id;
  assert.equal(pid, propertyId);

  r = await T.post('/visitors', { unit_id: unitId, name: 'Courier', purpose: 'Delivery', hours: 6, max_uses: 1 });
  assert.equal(r.status, 200);
  const pass = r.visitor;
  assert.match(pass.token, /^PO1:/);
  assert.match(pass.code, /^\d{6}$/);

  assert.equal((await X.post('/guard/verify', { property_id: propertyId, token: pass.token })).status, 404);
  let v = await G.post('/guard/verify', { property_id: propertyId, token: pass.token });
  assert.equal(v.result, 'allowed');
  assert.equal(v.visitor.unit, 'A1');
  v = await G.post('/guard/verify', { property_id: propertyId, token: pass.token });
  assert.equal(v.result, 'used');
  assert.ok((await T.get('/notifications')).items.some((n) => n.kind === 'visitor_arrived'));

  const forged = pass.token.slice(0, -3) + 'abc';
  v = await G.post('/guard/verify', { property_id: propertyId, token: forged });
  assert.equal(v.result, 'not_found');

  r = await T.post('/visitors', { unit_id: unitId, name: 'Plumber', hours: 2, max_uses: 2 });
  v = await G.post('/guard/verify', { property_id: propertyId, code: r.visitor.code });
  assert.equal(v.result, 'allowed');
  v = await G.post('/guard/verify', { property_id: propertyId, code: r.visitor.code });
  assert.equal(v.result, 'allowed');
  v = await G.post('/guard/verify', { property_id: propertyId, code: r.visitor.code });
  assert.ok(['not_found', 'used'].includes(v.result));

  r = await T.post('/visitors', { unit_id: unitId, name: 'Friend', hours: 1 });
  await T.post(`/visitors/${r.visitor.id}/cancel`);
  v = await G.post('/guard/verify', { property_id: propertyId, token: r.visitor.token || `PO1:${r.visitor.id}.x.y` });
  assert.ok(['not_found', 'cancelled'].includes(v.result));

  // walk-in
  assert.equal((await G.post('/guard/walkin', { property_id: propertyId, unit_id: unit2, name: 'Guest' })).status, 400);
  r = await G.post('/guard/walkin', { property_id: propertyId, unit_id: unitId, name: 'Uncle', purpose: 'Family' });
  assert.equal(r.status, 200);
  const wid = r.id;
  const req = (await T.get('/notifications')).items.find((n) => n.kind === 'visitor_request');
  assert.equal(req.ref, wid);
  assert.equal((await G.post('/guard/admit', { id: wid })).result, 'waiting');
  assert.equal((await T.post(`/visitors/${wid}/respond`, { approve: true })).st, 'active');
  assert.equal((await G.get(`/guard/walkin/${wid}`)).st, 'active');
  assert.equal((await G.post('/guard/admit', { id: wid })).result, 'allowed');

  const ov = await G.get(`/guard/overview?property_id=${propertyId}`);
  assert.ok(ov.recent.length >= 4);
  assert.ok(ov.units.length === 2);
  assert.equal((await X.get(`/guard/overview?property_id=${propertyId}`)).status, 404);
  assert.equal((await T.get(`/guard/overview?property_id=${propertyId}`)).status, 404);
});

test('landlord-assisted reset is allowed for single-purpose tenants; recovery code works once', async () => {
  const t = await L.post(`/units/${unitId}/reset-code`);
  assert.equal(t.status, 200);
  const c = new Client();
  assert.equal((await c.post('/auth/reset', { email: 'ravi@example.com', code: 'WRONGCODE1', authKey: key('9') })).status, 400);
  const ok = await c.post('/auth/reset', { email: 'ravi@example.com', code: t.code, authKey: key('9') });
  assert.equal(ok.status, 200);
  assert.ok(ok.recovery);
  assert.equal((await c.post('/auth/reset', { email: 'ravi@example.com', code: t.code, authKey: key('8') })).status, 400);
  // old session of the tenant is gone
  assert.equal((await T.get('/me')).status, 401);
  assert.equal((await c.post('/auth/login', { email: 'ravi@example.com', authKey: key('9') })).status, 200);
  const rec = ok.recovery.replace(/-/g, '');
  const d = new Client();
  assert.equal((await d.post('/auth/reset', { email: 'ravi@example.com', code: rec, authKey: key('7') })).status, 200);
  T.cookie = d.cookie;
});

test('landlord cannot reset an account that is used elsewhere', async () => {
  // X becomes a landlord with a property and also rents unit2 via invite
  const inv = await L.post(`/units/${unit2}/invite`);
  assert.equal((await X.post('/join', { code: inv.code })).status, 200);
  await X.post('/properties', { name: 'My Own Place' });
  const r = await L.post(`/units/${unit2}/reset-code`);
  assert.equal(r.status, 403);
});

test('rate limiting kicks in on repeated bad logins', async () => {
  const c = new Client();
  let last;
  for (let i = 0; i < 10; i++) last = await c.post('/auth/login', { email: 'ratelimit@example.com', authKey: key('f') });
  assert.equal(last.status, 429);
});

test('export and delete account', async () => {
  const res = await X.call('GET', '/me/export', undefined, { raw: true });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.user.email, 'x@example.com');
  assert.ok(data.properties.length >= 1);
  assert.equal((await X.post('/me/delete', { authKey: key('f') })).status, 403);
  assert.equal((await X.post('/me/delete', { authKey: key('d') })).status, 200);
  assert.equal((await X.get('/me')).status, 401);
  const u = await L.get('/properties');
  assert.ok(u.properties[0].units.find((x) => x.id === unit2));
});

test('demo: start, switch role, isolated data', async () => {
  const D = new Client();
  let r = await D.post('/demo/start', { role: 'landlord' });
  assert.equal(r.status, 200);
  assert.equal(r.user.is_demo, true);
  const board = await D.get('/rent');
  assert.ok(board.units.length === 4);
  assert.ok(board.summary.pending > 0);
  r = await D.post('/demo/switch', { role: 'tenant' });
  assert.equal(r.user.name, 'Rohan Mehta');
  const my = await D.get('/my/rent');
  assert.equal(my.tenancies[0].unit.label, '102');
  assert.ok(my.tenancies[0].ledger.rows.length >= 3);
  assert.equal((await D.post('/me/delete', { authKey: key('a') })).status, 403);
  r = await D.post('/demo/switch', { role: 'guard' });
  const g = await D.get('/me');
  const ov = await D.get(`/guard/overview?property_id=${g.guard_properties[0].id}`);
  assert.equal(ov.expected.length, 1);
  // a real landlord sees none of it
  const mine = await L.get('/properties');
  assert.ok(!mine.properties.some((p) => p.name === 'Sunrise Heights'));
});

test('delete property cascades', async () => {
  const r = await L.del(`/properties/${propertyId}`);
  assert.equal(r.status, 200);
  const raw = env.DB._raw;
  for (const t of ['units', 'payments', 'tickets', 'ticket_events', 'visitors', 'invites']) {
    const n = raw.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${t === 'ticket_events' ? "ticket_id IN (SELECT id FROM tickets)" : `1=1`}`).get().n;
    if (t === 'units') assert.ok(n >= 0);
  }
  const left = raw.prepare('SELECT COUNT(*) AS n FROM payments WHERE property_id = ?').get(propertyId).n;
  assert.equal(left, 0);
  assert.equal((await T.post(`/units/${unitId}/payments`, { period: '2026-09', amount: 1, method: 'cash' })).status, 404);
});
