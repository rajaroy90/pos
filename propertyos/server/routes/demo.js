import { all, notify, one, rateLimit, run, stmt, wipeUser } from '../db.js';
import { createSession, hashKey, newSalt, sessionCookie } from '../auth.js';
import { randomCode, randomId } from '../crypto.js';
import { ApiError, now, oneOf, pad2, ymOf, IST } from '../util.js';
import { publicUser } from './auth.js';

const DEMO_TTL = 3 * 3600;

function addMonths(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${pad2(m)}`;
}

async function purgeOldDemos(db) {
  const old = await all(db, 'SELECT id FROM users WHERE is_demo = 1 AND created_at < ? LIMIT 20', now() - DEMO_TTL);
  for (const u of old) await wipeUser(db, u.id);
}

async function mkUser(ctx, group, role, name, phone) {
  const id = randomId(16);
  const salt = newSalt();
  const key = randomCode(16).toLowerCase().padEnd(64, '0');
  await run(ctx.db,
    `INSERT INTO users (id, email, name, phone, role_hint, key_hash, key_salt, lang, is_demo, demo_group, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'en', 1, ?, ?)`,
    id, `demo-${id}@demo.invalid`, name, phone, role, await hashKey(ctx.secret, salt, key), salt, group, now());
  return id;
}

async function seed(ctx) {
  const group = randomId(12);
  const t = now();
  const cur = ymOf(t);
  const landlord = await mkUser(ctx, group, 'landlord', 'Meera Kulkarni', '+919800000001');
  const tenant = await mkUser(ctx, group, 'tenant', 'Rohan Mehta', '+919800000002');
  const guard = await mkUser(ctx, group, 'guard', 'Ramesh (Gate)', '+919800000003');
  const pid = randomId(14);
  await run(ctx.db,
    'INSERT INTO properties (id, owner_id, name, address, city, upi_id, upi_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    pid, landlord, 'Sunrise Heights', 'Lane 4, Kothrud', 'Pune', 'meera.demo@okbank', 'Meera Kulkarni', t);
  await run(ctx.db, "INSERT INTO members (user_id, property_id, role) VALUES (?, ?, 'guard')", guard, pid);

  const mk = async (label, rent, due, start, name, phone, tenantId = null) => {
    const id = randomId(14);
    await run(ctx.db,
      `INSERT INTO units (id, property_id, label, rent, deposit, due_day, start_month, tenant_id, tenant_name, tenant_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, pid, label, rent, rent * 2, due, start, tenantId, name, phone, t);
    return id;
  };
  const u101 = await mk('101', 14000, 5, addMonths(cur, -5), 'Asha Verma', '+919800000011');
  const u102 = await mk('102', 18500, 5, addMonths(cur, -3), 'Rohan Mehta', '+919800000002', tenant);
  await mk('201', 22000, 1, cur, '', '');
  const u202 = await mk('202', 16000, 10, addMonths(cur, -4), 'Sana Khan', '+919800000012');

  const pay = async (unit, period, amount, method, status, ago) => {
    const at = t - ago * 86400;
    await run(ctx.db,
      `INSERT INTO payments (id, unit_id, property_id, period, amount, method, status, utr, created_by, created_at, decided_by, decided_at, receipt_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
      randomId(14), unit, pid, period, amount, method, status, landlord, at,
      status === 'confirmed' ? landlord : null, status === 'confirmed' ? at : null, status === 'confirmed' ? `PO-${randomCode(8)}` : null);
  };
  for (let i = 5; i >= 0; i--) await pay(u101, addMonths(cur, -i), 14000, i % 2 ? 'upi' : 'cash', 'confirmed', i * 30);
  await pay(u102, addMonths(cur, -3), 18500, 'upi', 'confirmed', 90);
  await pay(u102, addMonths(cur, -2), 18500, 'upi', 'confirmed', 60);
  await pay(u102, addMonths(cur, -1), 18500, 'cash', 'confirmed', 30);
  await pay(u202, addMonths(cur, -4), 16000, 'upi', 'confirmed', 120);
  await pay(u202, addMonths(cur, -3), 16000, 'upi', 'confirmed', 90);
  await pay(u202, addMonths(cur, -2), 16000, 'cash', 'confirmed', 60);
  await pay(u202, cur, 8000, 'upi', 'pending', 0);

  const ticket = async (unit, title, desc, cat, urgency, status, by, daysAgo, vendor = '') => {
    const id = randomId(14);
    const at = t - daysAgo * 86400;
    await run(ctx.db,
      `INSERT INTO tickets (id, property_id, unit_id, created_by, title, description, category, urgency, status, vendor_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, pid, unit, by, title, desc, cat, urgency, status, vendor, at, at + 3600);
    await run(ctx.db, "INSERT INTO ticket_events (id, ticket_id, user_id, kind, text, at) VALUES (?, ?, ?, 'created', '', ?)", randomId(14), id, by, at);
    if (vendor) await run(ctx.db, "INSERT INTO ticket_events (id, ticket_id, user_id, kind, text, at) VALUES (?, ?, ?, 'assign', ?, ?)", randomId(14), id, landlord, vendor, at + 1800);
  };
  await ticket(u102, 'AC is not cooling', 'Bedroom AC runs but the room stays warm. Started two days ago.', 'appliance', 'urgent', 'assigned', tenant, 1, 'CoolFix Services');
  await ticket(u101, 'Kitchen tap leaking', 'Slow drip under the sink.', 'plumbing', 'normal', 'closed', landlord, 12, 'Mahesh plumber');

  await run(ctx.db,
    `INSERT INTO visitors (id, property_id, unit_id, host_id, name, purpose, status, code, valid_from, valid_to, max_uses, created_at)
     VALUES (?, ?, ?, ?, ?, 'Delivery', 'active', '482913', ?, ?, 1, ?)`, randomId(14), pid, u102, tenant, 'Courier (Blue Dart)', t, t + 6 * 3600, t);

  await notify(ctx.db, landlord, 'rent_claim', { unit: '202', property: 'Sunrise Heights', amount: 8000, period: cur, method: 'upi', who: 'Sana Khan' });
  await notify(ctx.db, tenant, 'ticket_status', { title: 'AC is not cooling', unit: '102', status: 'assigned', text: 'CoolFix Services' });
  return { group, landlord, tenant, guard };
}

export function register(r) {
  r.add('POST', '/demo/start', async (ctx) => {
    await rateLimit(ctx.db, `demo:${ctx.ip}`, 20, 3600);
    const role = oneOf(ctx.body.role || 'landlord', ['landlord', 'tenant', 'guard'], 'role');
    await purgeOldDemos(ctx.db);
    const ids = await seed(ctx);
    const token = await createSession(ctx.db, ids[role], ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure, DEMO_TTL));
    const u = await one(ctx.db, 'SELECT * FROM users WHERE id = ?', ids[role]);
    return { user: publicUser(u) };
  }, { auth: false });

  r.add('POST', '/demo/switch', async (ctx) => {
    if (!ctx.user.is_demo) throw new ApiError(403, 'forbidden', 'Only available in the demo.');
    const role = oneOf(ctx.body.role, ['landlord', 'tenant', 'guard'], 'role');
    const target = await one(ctx.db, 'SELECT * FROM users WHERE demo_group = ? AND role_hint = ?', ctx.user.demo_group, role);
    if (!target) throw new ApiError(404, 'not_found', 'Demo expired. Start a new one.');
    await run(ctx.db, 'DELETE FROM sessions WHERE id = ?', ctx.user._sid);
    const token = await createSession(ctx.db, target.id, ctx.ua);
    ctx.cookies.push(sessionCookie(token, ctx.secure, DEMO_TTL));
    return { user: publicUser(target) };
  });
}
