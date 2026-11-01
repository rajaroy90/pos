import { ensureSchema, prune } from './db.js';
import { userFromRequest } from './auth.js';
import { ApiError, json } from './util.js';
import * as auth from './routes/auth.js';
import * as props from './routes/props.js';
import * as rent from './routes/rent.js';
import * as tickets from './routes/tickets.js';
import * as visitors from './routes/visitors.js';
import * as misc from './routes/misc.js';
import * as demo from './routes/demo.js';

function createRouter() {
  const routes = [];
  return {
    add(method, path, handler, opts = {}) {
      const keys = [];
      const re = new RegExp('^' + path.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
      routes.push({ method, re, keys, handler, auth: opts.auth !== false });
    },
    match(method, path) {
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = r.re.exec(path);
        if (m) {
          const params = {};
          try { r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); } catch { return null; } // bad %-encoding: no such route
          return { route: r, params };
        }
      }
      return null;
    },
  };
}

const router = createRouter();
[auth, props, rent, tickets, visitors, misc, demo].forEach((m) => m.register(router));

const MAX_BODY = 600_000;

/**
 * Entry point shared by Cloudflare Pages Functions and the local dev server.
 * env: { DB: D1Database, APP_SECRET: string }
 */
export async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const cookies = [];
  const respond = (res) => {
    const h = new Headers(res.headers);
    h.set('x-content-type-options', 'nosniff');
    h.set('referrer-policy', 'same-origin');
    for (const c of cookies) h.append('set-cookie', c);
    return new Response(res.body, { status: res.status, headers: h });
  };

  try {
    if (!env.DB) throw new ApiError(500, 'config', 'Database is not connected. Add a D1 binding named DB.');
    if (!env.APP_SECRET || String(env.APP_SECRET).length < 16) throw new ApiError(500, 'config', 'APP_SECRET is missing. Add it as a secret (at least 16 characters).');
    await ensureSchema(env.DB);
    if (Math.random() < 0.01) { try { await prune(env.DB); } catch (e) { console.error('prune failed', e); } }

    const matched = router.match(request.method, path);
    if (!matched) throw new ApiError(404, 'not_found', 'Not found');
    const { route, params } = matched;

    const mutating = request.method !== 'GET' && request.method !== 'HEAD';
    if (mutating) {
      // CSRF: custom header forces a CORS preflight, which we never allow. Origin must also match when present.
      if (request.headers.get('x-po') !== '1') throw new ApiError(403, 'csrf', 'Request blocked.');
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) throw new ApiError(403, 'csrf', 'Request blocked.');
    }

    let body = {};
    if (mutating && request.method !== 'DELETE') {
      const len = Number(request.headers.get('content-length') || 0);
      if (len > MAX_BODY) throw new ApiError(413, 'too_large', 'That upload is too large.');
      const text = await request.text();
      if (text.length > MAX_BODY) throw new ApiError(413, 'too_large', 'That upload is too large.');
      if (text) {
        try { body = JSON.parse(text); } catch { throw new ApiError(400, 'bad_json', 'Invalid request.'); }
        if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'bad_json', 'Invalid request.');
      }
    }

    const ctx = {
      db: env.DB, env, secret: String(env.APP_SECRET), req: request, url, params, body, cookies,
      ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local',
      ua: request.headers.get('user-agent') || '',
      origin: url.origin,
      secure: url.protocol === 'https:',
      user: null,
    };
    if (route.auth) {
      ctx.user = await userFromRequest(ctx.db, request);
      if (!ctx.user) throw new ApiError(401, 'unauthenticated', 'Please sign in.');
    }
    const out = await route.handler(ctx);
    if (out instanceof Response) return respond(out);
    return respond(json({ ok: true, ...out }));
  } catch (e) {
    if (e instanceof ApiError) return respond(json({ ok: false, error: e.code, message: e.message }, e.status));
    console.error('unhandled', e && e.stack ? e.stack : e);
    return respond(json({ ok: false, error: 'server_error', message: 'Something went wrong on our side. Please try again.' }, 500));
  }
}
