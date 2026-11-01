import { all, notify, one, rateLimit, run, stmt } from '../db.js';
import { randomId } from '../crypto.js';
import { sinceTenancy, unitAccess } from '../access.js';
import { ApiError, normPhone, now, oneOf, str } from '../util.js';

const CATEGORIES = ['plumbing', 'electrical', 'appliance', 'cleaning', 'pest', 'structure', 'other'];
const URGENCY = ['low', 'normal', 'urgent'];
const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
const MAX_PHOTO = 380_000; // characters of data URL (~280 KB image)
const MAX_PHOTOS_PER_UNIT = 40;

const tView = (t) => ({
  id: t.id, unit_id: t.unit_id, property_id: t.property_id, title: t.title, description: t.description, category: t.category,
  urgency: t.urgency, status: t.status, vendor_name: t.vendor_name, vendor_phone: t.vendor_phone, has_photo: !!t.has_photo,
  created_at: t.created_at, updated_at: t.updated_at, unit: t.unit_label, property: t.property_name,
});

async function loadTicket(ctx, id) {
  const t = await one(ctx.db, 'SELECT * FROM tickets WHERE id = ?', id);
  if (!t) throw new ApiError(404, 'not_found', 'Not found');
  const access = await unitAccess(ctx.db, ctx.user, t.unit_id);
  if (!sinceTenancy(access, t.created_at)) throw new ApiError(404, 'not_found', 'Not found');
  return { t, ...access };
}

function otherParty(unit, property, as) {
  return as === 'owner' ? unit.tenant_id : property.owner_id;
}

export function register(r) {
  r.add('GET', '/tickets', async (ctx) => {
    const rows = await all(ctx.db,
      `SELECT t.*, u.label AS unit_label, p.name AS property_name,
              CASE WHEN p.owner_id = ? THEN 'owner' ELSE 'tenant' END AS viewer_as
       FROM tickets t JOIN units u ON u.id = t.unit_id JOIN properties p ON p.id = t.property_id
       WHERE p.owner_id = ? OR (u.tenant_id = ? AND t.created_at >= u.tenant_since)
       ORDER BY CASE t.status WHEN 'closed' THEN 1 ELSE 0 END, t.updated_at DESC LIMIT 120`,
      ctx.user.id, ctx.user.id, ctx.user.id);
    return { tickets: rows.map((t) => ({ ...tView(t), as: t.viewer_as })) };
  });

  r.add('POST', '/tickets', async (ctx) => {
    await rateLimit(ctx.db, `ticket:${ctx.user.id}`, 20, 3600);
    const b = ctx.body;
    const { unit, property, as } = await unitAccess(ctx.db, ctx.user, str(b.unit_id, { min: 1, max: 40, name: 'unit' }));
    const title = str(b.title, { min: 3, max: 80, name: 'title' });
    const description = str(b.description, { max: 1000, name: 'description' });
    const category = oneOf(b.category || 'other', CATEGORIES, 'category');
    const urgency = oneOf(b.urgency || 'normal', URGENCY, 'urgency');
    let photo = '';
    if (b.photo) {
      photo = str(b.photo, { max: MAX_PHOTO, name: 'photo', trim: false });
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)) throw new ApiError(400, 'invalid_input', 'Photo must be a JPEG, PNG or WebP image.');
      const have = await one(ctx.db, 'SELECT COUNT(*) AS n FROM tickets WHERE unit_id = ? AND has_photo = 1', unit.id);
      if (have.n >= MAX_PHOTOS_PER_UNIT) throw new ApiError(400, 'limit', 'This flat has reached its photo limit. Send the request without a photo.');
    }
    const id = randomId(14);
    const t = now();
    const stmts = [
      stmt(ctx.db,
        `INSERT INTO tickets (id, property_id, unit_id, created_by, title, description, category, urgency, status, has_photo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
        id, property.id, unit.id, ctx.user.id, title, description, category, urgency, photo ? 1 : 0, t, t),
      stmt(ctx.db, "INSERT INTO ticket_events (id, ticket_id, user_id, kind, text, at) VALUES (?, ?, ?, 'created', '', ?)", randomId(14), id, ctx.user.id, t),
    ];
    if (photo) stmts.push(stmt(ctx.db, 'INSERT INTO ticket_photos (ticket_id, data) VALUES (?, ?)', id, photo));
    await ctx.db.batch(stmts);
    await notify(ctx.db, otherParty(unit, property, as), 'ticket_new', { title, unit: unit.label, property: property.name, urgency }, id);
    return { id };
  });

  r.add('GET', '/tickets/:id', async (ctx) => {
    const { t, unit, property, as } = await loadTicket(ctx, ctx.params.id);
    const events = await all(ctx.db,
      `SELECT e.id, e.kind, e.text, e.at, e.user_id, u.name FROM ticket_events e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.ticket_id = ? ORDER BY e.at, e.rowid`, t.id);
    const photo = t.has_photo ? (await one(ctx.db, 'SELECT data FROM ticket_photos WHERE ticket_id = ?', t.id))?.data || '' : '';
    return {
      ticket: { ...tView({ ...t, unit_label: unit.label, property_name: property.name }), as, photo },
      events: events.map((e) => ({ id: e.id, kind: e.kind, text: e.text, at: e.at, name: e.name || '', mine: e.user_id === ctx.user.id })),
      tenant: as === 'owner' ? { name: unit.tenant_name, phone: unit.tenant_phone } : null,
    };
  });

  r.add('POST', '/tickets/:id/events', async (ctx) => {
    await rateLimit(ctx.db, `tev:${ctx.user.id}`, 60, 3600);
    const { t, unit, property, as } = await loadTicket(ctx, ctx.params.id);
    const b = ctx.body;
    const kind = oneOf(b.kind, ['comment', 'status', 'assign'], 'kind');
    const when = now();
    let text = '';
    let newStatus = t.status;
    let vendorName = t.vendor_name;
    let vendorPhone = t.vendor_phone;

    if (kind === 'comment') {
      text = str(b.text, { min: 1, max: 500, name: 'comment' });
    } else if (kind === 'status') {
      newStatus = oneOf(b.status, STATUSES, 'status');
      text = str(b.text, { max: 500, name: 'note' });
      if (as === 'tenant') {
        const okMove = (t.status === 'resolved' && (newStatus === 'closed' || newStatus === 'open'));
        if (!okMove) throw new ApiError(403, 'forbidden', 'You can confirm or reopen a repair once it is marked resolved.');
      }
    } else {
      if (as !== 'owner') throw new ApiError(403, 'forbidden', 'Only the landlord can assign a vendor.');
      vendorName = str(b.vendor_name, { min: 1, max: 60, name: 'vendor name' });
      vendorPhone = normPhone(b.vendor_phone);
      text = `${vendorName}${vendorPhone ? ` (${vendorPhone})` : ''}`;
      if (t.status === 'open') newStatus = 'assigned';
    }

    await ctx.db.batch([
      stmt(ctx.db, 'INSERT INTO ticket_events (id, ticket_id, user_id, kind, text, at) VALUES (?, ?, ?, ?, ?, ?)',
        randomId(14), t.id, ctx.user.id, kind === 'status' ? `status:${newStatus}` : kind, text, when),
      stmt(ctx.db, 'UPDATE tickets SET status = ?, vendor_name = ?, vendor_phone = ?, updated_at = ? WHERE id = ?', newStatus, vendorName, vendorPhone, when, t.id),
    ]);
    const notifyKind = kind === 'comment' ? 'ticket_comment' : 'ticket_status';
    await notify(ctx.db, otherParty(unit, property, as), notifyKind, { title: t.title, unit: unit.label, status: newStatus, text: text.slice(0, 80) }, t.id);
    return { status: newStatus };
  });
}
