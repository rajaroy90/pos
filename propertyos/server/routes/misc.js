import { all, one, run, stmt } from '../db.js';
import { int, now } from '../util.js';

export function register(r) {
  r.add('GET', '/notifications', async (ctx) => {
    const limit = Math.min(60, Math.max(1, Number(ctx.url.searchParams.get('limit')) || 40));
    const rows = await all(ctx.db,
      'SELECT id, kind, data, ref, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', ctx.user.id, limit);
    const unread = await one(ctx.db, 'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', ctx.user.id);
    return {
      unread: unread.n,
      items: rows.map((n) => {
        let data = {};
        try { data = JSON.parse(n.data); } catch { /* keep empty */ }
        return { id: n.id, kind: n.kind, data, ref: n.ref, created_at: n.created_at, read: !!n.read_at };
      }),
    };
  });

  r.add('POST', '/notifications/read', async (ctx) => {
    const t = now();
    if (ctx.body.all === true) {
      await run(ctx.db, 'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', t, ctx.user.id);
      return {};
    }
    const ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.slice(0, 60).filter((x) => typeof x === 'string' && x.length < 40) : [];
    if (ids.length) {
      await ctx.db.batch(ids.map((id) => stmt(ctx.db, 'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', t, id, ctx.user.id)));
    }
    return {};
  });

  r.add('GET', '/health', async (ctx) => ({ ok: true, secret_set: !!ctx.secret, time: now() }), { auth: false });
}
