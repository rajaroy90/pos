// Local dev server: serves /public and runs the same API code as Cloudflare, on a SQLite file.
//   node --no-warnings dev/server.mjs            (PORT=8787, data in dev/.data/dev.db)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createD1 } from './d1-shim.js';
import { handle } from '../server/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(here, '../public');
const PORT = Number(process.env.PORT || 8787);

let dbPath = ':memory:';
if (process.env.DB_FILE !== ':memory:') {
  const dir = path.join(here, '.data');
  fs.mkdirSync(dir, { recursive: true });
  dbPath = process.env.DB_FILE || path.join(dir, 'dev.db');
}
const env = { DB: createD1(dbPath), APP_SECRET: process.env.APP_SECRET || 'dev-only-secret-change-me-0123456789abcdef' };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain',
};

// Apply the first (/*) block of public/_headers so CSP problems show up in dev, not only in production.
function globalHeaders() {
  try {
    const out = {};
    const lines = fs.readFileSync(path.join(PUB, '_headers'), 'utf8').split('\n');
    let inGlobal = false;
    for (const l of lines) {
      if (/^\S/.test(l)) { inGlobal = l.trim() === '/*'; continue; }
      if (inGlobal && l.includes(':')) { const i = l.indexOf(':'); out[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
    }
    return out;
  } catch { return {}; }
}
const HEADERS = globalHeaders();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env);
      const headers = {};
      r.headers.forEach((v, k) => { headers[k] = v; });
      const cookies = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
      if (cookies.length) headers['set-cookie'] = cookies;
      res.writeHead(r.status, headers);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(PUB, p);
    if (!file.startsWith(PUB)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(p)) { res.writeHead(404); res.end('Not found'); return; }
      file = path.join(PUB, 'index.html');
    }
    const ext = path.extname(file);
    res.writeHead(200, { ...HEADERS, 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Server error');
  }
});

server.listen(PORT, () => console.log(`PropertyOS dev server on http://localhost:${PORT}`));
