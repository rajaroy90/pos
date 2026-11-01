/**
 * PropertyOS build: esbuild + content hashing + service-worker precache injection.
 *
 *   npm run build     one-off build into dist/
 *   npm run dev       build, rebuild on change, serve dist/ on http://localhost:3000
 *   npm run preview   serve the existing dist/ on http://localhost:4173
 *
 * The app is a set of CLASSIC scripts that share one global scope, so:
 *   - every script is processed on its own (esbuild transform: minify only, no bundling,
 *     no format wrapper, top-level names untouched) and kept as a separate <script> tag in
 *     the original order; nothing is concatenated;
 *   - the only bundled file is src/supabase-bridge.js (IIFE) which replaces vendor/supabase.js.
 * Output files are named <name>.<content-hash>.<ext> in dist/build/.
 * config.js, manifest.webmanifest and assets/ are copied unchanged (config.js is never hashed).
 */
import { build, transform, formatMessages } from 'esbuild';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { watch } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const TMP = path.join(ROOT, 'dist.tmp'); // built here first so a failed build never destroys the last good dist/
const OUT = 'build'; // dist/build/: content-hashed JS + CSS

// Highest syntax level the source already uses (optional chaining, ??). Never emit anything newer.
const JS_TARGET = 'es2020';

// Source script that is replaced by a bundled bridge (esbuild bundle, IIFE).
const BRIDGES = { 'vendor/supabase.js': 'src/supabase-bridge.js' };
// Copied verbatim, never hashed, never rewritten.
const PLAIN = new Set(['config.js']);
// Service worker: these must install successfully; everything else precached is best-effort.
const ESSENTIAL_SRC = ['css/base.css', 'js/core/app.js', 'vendor/supabase.js', 'vendor/qr.js'];

const sha = (data, n = 10) => createHash('sha256').update(data).digest('hex').slice(0, n);
const exists = (p) => fs.access(p).then(() => true, () => false);
const isLocal = (u) => !!u && !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

async function warn(warnings) {
  if (!warnings || !warnings.length) return;
  for (const line of await formatMessages(warnings, { kind: 'warning', color: false })) console.warn(line);
}

async function buildJs(src) {
  if (BRIDGES[src]) {
    const r = await build({
      entryPoints: [path.join(ROOT, BRIDGES[src])],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: JS_TARGET,
      minify: true,
      charset: 'utf8',
      write: false,
      logLevel: 'warning',
    });
    return r.outputFiles[0].text;
  }
  const r = await transform(await fs.readFile(path.join(ROOT, src), 'utf8'), {
    loader: 'js',
    minify: true,
    target: JS_TARGET,
    charset: 'utf8', // keep non-ASCII characters exactly as written
    sourcefile: src,
  });
  await warn(r.warnings);
  return r.code;
}

async function buildCss(src) {
  const r = await transform(await fs.readFile(path.join(ROOT, src), 'utf8'), {
    loader: 'css',
    minify: true,
    charset: 'utf8',
    sourcefile: src,
  });
  await warn(r.warnings);
  return r.code;
}

async function run() {
  const t0 = Date.now();
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(path.join(TMP, OUT), { recursive: true });

  // 1. Find local scripts and stylesheets in index.html, in document order.
  const srcHtml = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const jobs = [];
  for (const m of srcHtml.matchAll(/<(script|link)\b[^>]*>/g)) {
    const tag = m[0];
    if (m[1] === 'script') {
      const url = attr(tag, 'src');
      if (!isLocal(url)) continue;
      if (/\stype="module"/.test(tag)) throw new Error(`index.html: ES module script not supported: ${tag}`);
      jobs.push({ tag, name: 'src', url, ext: 'js' });
    } else if (/\srel="stylesheet"/.test(tag)) {
      const url = attr(tag, 'href');
      if (!isLocal(url)) continue;
      jobs.push({ tag, name: 'href', url, ext: 'css' });
    }
  }
  if (!jobs.length) throw new Error('index.html: no local scripts or stylesheets found');

  // 2. Process each one individually; map source path -> hashed URL.
  const emitted = new Map(); // source path -> 'build/<name>.<hash>.<ext>'
  const stems = new Set();
  const stats = { jsIn: 0, jsOut: 0, cssIn: 0, cssOut: 0 };
  let html = srcHtml;
  for (const job of jobs) {
    const src = job.url.split(/[?#]/)[0];
    let newUrl;
    if (PLAIN.has(src)) {
      newUrl = src;
    } else if (emitted.has(src)) {
      newUrl = emitted.get(src);
    } else {
      const code = job.ext === 'js' ? await buildJs(src) : await buildCss(src);
      const stem = path.basename(src, '.' + job.ext);
      if (stems.has(stem + job.ext)) throw new Error(`Two sources share the file name ${stem}.${job.ext}`);
      stems.add(stem + job.ext);
      newUrl = `${OUT}/${stem}.${sha(code)}.${job.ext}`;
      await fs.writeFile(path.join(TMP, newUrl), code);
      emitted.set(src, newUrl);
      const inSize = BRIDGES[src] ? 0 : (await fs.stat(path.join(ROOT, src))).size;
      stats[job.ext === 'js' ? 'jsIn' : 'cssIn'] += inSize;
      stats[job.ext === 'js' ? 'jsOut' : 'cssOut'] += Buffer.byteLength(code);
    }
    const newTag = job.tag.replace(`${job.name}="${job.url}"`, () => `${job.name}="${newUrl}"`);
    html = html.replace(job.tag, () => newTag);
  }
  // Drop any remaining manual ?v= cache-busters from other tags.
  html = html.replace(/((?:src|href)="[^"?#]*)\?v=[^"#]*"/g, '$1"');
  if (html.includes('?v=')) throw new Error('index.html: a ?v= string is still present after rewriting');
  await fs.writeFile(path.join(TMP, 'index.html'), html);

  // 3. Copy runtime files unchanged.
  await fs.cp(path.join(ROOT, 'assets'), path.join(TMP, 'assets'), { recursive: true });
  for (const f of ['manifest.webmanifest', 'config.js', '_headers']) {
    if (await exists(path.join(ROOT, f))) await fs.copyFile(path.join(ROOT, f), path.join(TMP, f));
  }
  if (await exists(path.join(ROOT, 'vendor/LICENSE-qrcode.txt'))) {
    await fs.mkdir(path.join(TMP, 'vendor'), { recursive: true });
    await fs.copyFile(path.join(ROOT, 'vendor/LICENSE-qrcode.txt'), path.join(TMP, 'vendor/LICENSE-qrcode.txt'));
  }

  // 4. Precache manifest = every runtime file with its content hash. Its hash names the cache.
  const files = (await walk(TMP)).filter((f) => f !== '_headers' && f !== 'sw.js' && !f.startsWith('vendor/'));
  const entries = [];
  for (const f of files) entries.push([f, sha(await fs.readFile(path.join(TMP, f)), 16)]);
  const cacheName = `propertyos-${sha(JSON.stringify(entries))}`;
  const precache = ['./', ...files];
  const essential = ['./', 'index.html', 'manifest.webmanifest', 'config.js'];
  for (const s of ESSENTIAL_SRC) {
    if (!emitted.has(s)) throw new Error(`index.html no longer references ${s}, which sw.js treats as essential`);
    essential.push(emitted.get(s));
  }

  // 5. Inject into sw.js (placeholders appear exactly once each).
  let sw = await fs.readFile(path.join(ROOT, 'sw.js'), 'utf8');
  const subs = [
    ["'__CACHE_NAME__'", JSON.stringify(cacheName)],
    ['/*__PRECACHE__*/[]', JSON.stringify(precache, null, 2)],
    ['/*__ESSENTIAL__*/[]', JSON.stringify(essential, null, 2)],
  ];
  for (const [placeholder, value] of subs) {
    if (sw.split(placeholder).length !== 2) throw new Error(`sw.js: placeholder ${placeholder} must appear exactly once`);
    sw = sw.replace(placeholder, () => value);
  }
  await fs.writeFile(path.join(TMP, 'sw.js'), sw);

  // 6. Swap into place.
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.rename(TMP, DIST);

  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  console.log(
    `built dist/ in ${Date.now() - t0} ms: ${emitted.size} hashed files, ${precache.length} precache entries, cache ${cacheName}\n` +
      `  js  ${kb(stats.jsIn)} source (excl. supabase) -> ${kb(stats.jsOut)} output (incl. supabase bundle)\n` +
      `  css ${kb(stats.cssIn)} -> ${kb(stats.cssOut)}`
  );
}

async function safeRun() {
  try {
    await run();
  } catch (e) {
    await fs.rm(TMP, { recursive: true, force: true });
    console.error('build failed:', e && e.message ? e.message : e);
    return false;
  }
  return true;
}

// ---- dev / preview server (applies dist/_headers so CSP and cache rules match production) ----
async function headerRules() {
  const txt = await fs.readFile(path.join(DIST, '_headers'), 'utf8').catch(() => '');
  const rules = [];
  let cur;
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line)) {
      const i = line.indexOf(':');
      if (cur && i > 0) cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    } else {
      const pattern = line.trim().split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      cur = { re: new RegExp(`^${pattern}$`), headers: [] };
      rules.push(cur);
    }
  }
  return rules;
}

async function serve(port, dev) {
  const { default: sirv } = await import('sirv');
  const files = sirv(DIST, { dev, etag: true });
  createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    for (const rule of await headerRules()) {
      if (rule.re.test(pathname)) for (const [k, v] of rule.headers) res.setHeader(k, v);
    }
    files(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  }).listen(port, () => console.log(`serving dist/ at http://localhost:${port}`));
}

function watchSources(onChange) {
  let timer;
  watch(ROOT, { recursive: true }, (_event, file) => {
    if (!file || /^(dist|dist\.tmp|node_modules|\.git)$/.test(file.split(path.sep)[0])) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, 150);
  });
}

const args = new Set(process.argv.slice(2));
if (args.has('--preview')) {
  if (!(await exists(DIST))) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }
  await serve(Number(process.env.PORT) || 4173, false);
} else if (args.has('--dev')) {
  await safeRun();
  watchSources(async () => {
    console.log('change detected, rebuilding...');
    await safeRun();
  });
  await serve(Number(process.env.PORT) || 3000, true);
} else if (!(await safeRun())) {
  process.exit(1);
}
