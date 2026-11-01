/**
 * PropertyOS build check: `npm run build && npm run check`
 * Verifies dist/ without a browser. Exits non-zero on any failure.
 *
 *  1. every URL referenced by dist/index.html (and by the web manifest) exists
 *  2. script and stylesheet order in dist/index.html equals the source index.html
 *  3. no inline <script> (the CSP is `script-src 'self'`)
 *  4. sw.js: placeholders replaced, cache name set, every precache entry exists,
 *     everything index.html loads is precached, sw.js itself is not precached
 *  5. every emitted JS file parses as a classic script (`node --check` on stdin, plus vm.Script)
 *  6. no "?v=" anywhere in dist
 *  7. config.js, manifest.webmanifest and assets/ are byte-identical to the source
 *  8. _headers and vercel.json carry the same CSP
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const rd = (p) => fs.readFileSync(p, 'utf8');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const isLocal = (u) => !!u && !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const clean = (u) => u.split(/[?#]/)[0];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

let failures = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const section = (t) => console.log(`\n${t}`);

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}
const distHtml = rd(path.join(DIST, 'index.html'));
const srcHtml = rd(path.join(ROOT, 'index.html'));
const tags = (html) => [...html.matchAll(/<(script|link|meta)\b[^>]*>/g)].map((m) => ({ kind: m[1], tag: m[0] }));

// 1. referenced URLs exist -------------------------------------------------------------
section('1. URLs referenced by dist/index.html exist');
{
  const f0 = failures;
  let n = 0;
  for (const { kind, tag } of tags(distHtml)) {
    let url;
    if (kind === 'script') url = attr(tag, 'src');
    else if (kind === 'link') url = attr(tag, 'href');
    else if (/property="og:image"/.test(tag)) url = attr(tag, 'content');
    if (!isLocal(url)) continue;
    n++;
    if (!fs.existsSync(path.join(DIST, clean(url)))) bad(`missing: ${url}`);
  }
  const manifest = JSON.parse(rd(path.join(DIST, 'manifest.webmanifest')));
  const mUrls = [...(manifest.icons || []), ...(manifest.shortcuts || []).flatMap((s) => s.icons || [])].map((i) => i.src);
  for (const u of mUrls) {
    n++;
    if (!fs.existsSync(path.join(DIST, clean(u)))) bad(`manifest icon missing: ${u}`);
  }
  if (failures === f0) ok(`${n} referenced URLs all exist`);
}

// 2. order equals source ---------------------------------------------------------------
section('2. script and stylesheet order equals the source index.html');
{
  const sequence = (html) =>
    tags(html)
      .map(({ kind, tag }) => {
        if (kind === 'script') return { kind: 'script', url: attr(tag, 'src') };
        if (kind === 'link' && /\srel="stylesheet"/.test(tag)) return { kind: 'css', url: attr(tag, 'href') };
        return null;
      })
      .filter((x) => x && isLocal(x.url));
  const src = sequence(srcHtml);
  const out = sequence(distHtml);
  if (src.length !== out.length) bad(`source has ${src.length} local scripts/styles, dist has ${out.length}`);
  let mismatches = 0;
  src.forEach((s, i) => {
    const o = out[i];
    const p = clean(s.url);
    const ext = path.extname(p).slice(1);
    const stem = path.basename(p, '.' + ext);
    const expected = p === 'config.js' ? /^config\.js$/ : new RegExp(`^build/${esc(stem)}\\.[0-9a-f]{10}\\.${ext}$`);
    if (!o || o.kind !== s.kind || !expected.test(o.url)) {
      mismatches++;
      bad(`position ${i + 1}: expected ${p} -> ${expected}, found ${o ? o.url : '(nothing)'}`);
    }
  });
  if (!mismatches && src.length === out.length) ok(`${src.length} tags in identical order (${src.filter((s) => s.kind === 'script').length} scripts, ${src.filter((s) => s.kind === 'css').length} stylesheets)`);
}

// 3. no inline scripts -----------------------------------------------------------------
section('3. no inline scripts (CSP: script-src \'self\')');
{
  const inline = [...distHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => !/\ssrc="/.test(m[1]) || m[2].trim());
  if (inline.length) bad(`${inline.length} inline <script> block(s) in dist/index.html`);
  else ok('every <script> is an external same-origin file');
}

// 4. service worker --------------------------------------------------------------------
section('4. service worker');
{
  const swSrc = rd(path.join(DIST, 'sw.js'));
  if (/__CACHE_NAME__|__PRECACHE__|__ESSENTIAL__/.test(swSrc)) bad('a placeholder is still present in dist/sw.js');
  let ctx;
  try {
    ctx = vm.runInNewContext(`${swSrc}\n;({ CACHE, PRECACHE, ESSENTIAL })`, { self: { addEventListener() {} } });
  } catch (e) {
    bad(`dist/sw.js did not evaluate: ${e.message}`);
  }
  if (ctx) {
    const { CACHE, PRECACHE, ESSENTIAL } = ctx;
    if (!/^propertyos-[0-9a-f]{10}$/.test(CACHE)) bad(`unexpected cache name: ${CACHE}`);
    else ok(`cache name ${CACHE}`);
    const missing = PRECACHE.filter((u) => u !== './' && !fs.existsSync(path.join(DIST, u)));
    if (missing.length) bad(`precache entries missing from dist: ${missing.join(', ')}`);
    else ok(`${PRECACHE.length} precache entries all exist`);
    const notPre = ESSENTIAL.filter((u) => !PRECACHE.includes(u));
    if (notPre.length) bad(`essential entries not in precache: ${notPre.join(', ')}`);
    else ok(`${ESSENTIAL.length} essential entries are in the precache`);
    if (PRECACHE.includes('sw.js')) bad('sw.js must not precache itself');
    const loaded = tags(distHtml)
      .map(({ kind, tag }) => (kind === 'script' ? attr(tag, 'src') : kind === 'link' && /\srel="stylesheet"/.test(tag) ? attr(tag, 'href') : null))
      .filter(isLocal);
    const notCached = loaded.filter((u) => !PRECACHE.includes(u));
    if (notCached.length) bad(`loaded by index.html but not precached: ${notCached.join(', ')}`);
    else ok('everything index.html loads is precached (offline start works)');
    for (const must of ['index.html', 'config.js', 'manifest.webmanifest']) if (!PRECACHE.includes(must)) bad(`${must} missing from precache`);
  }
}

// 5. syntax ----------------------------------------------------------------------------
section('5. every emitted JS file parses as a classic script');
{
  const js = walk(DIST).filter((f) => f.endsWith('.js'));
  let bads = 0;
  for (const f of js) {
    const code = rd(path.join(DIST, f));
    const r = spawnSync(process.execPath, ['--check'], { input: code, encoding: 'utf8' });
    if (r.status !== 0) {
      bads++;
      bad(`node --check failed: ${f}\n${(r.stderr || '').split('\n').slice(0, 4).join('\n')}`);
      continue;
    }
    try {
      new vm.Script(code, { filename: f }); // parse only, never executed
    } catch (e) {
      bads++;
      bad(`classic-script parse failed: ${f}: ${e.message}`);
    }
  }
  if (!bads) ok(`${js.length} files pass node --check and parse as classic scripts`);
}

// 6. no ?v= ----------------------------------------------------------------------------
section('6. no "?v=" left in dist');
{
  const hits = walk(DIST).filter((f) => /\.(html|js|css|webmanifest|json|txt)$/.test(f) || f === '_headers').filter((f) => rd(path.join(DIST, f)).includes('?v='));
  if (hits.length) bad(`"?v=" found in: ${hits.join(', ')}`);
  else ok('none');
}

// 7. unchanged files -------------------------------------------------------------------
section('7. config.js, manifest and assets are byte-identical to the source');
{
  const f0 = failures;
  let n = 0;
  const same = (rel) => {
    n++;
    if (!fs.existsSync(path.join(DIST, rel))) return bad(`missing in dist: ${rel}`);
    if (sha(path.join(ROOT, rel)) !== sha(path.join(DIST, rel))) bad(`differs from source: ${rel}`);
  };
  same('config.js');
  same('manifest.webmanifest');
  const srcAssets = walk(path.join(ROOT, 'assets')).map((f) => `assets/${f}`);
  srcAssets.forEach(same);
  const extra = walk(path.join(DIST, 'assets')).map((f) => `assets/${f}`).filter((f) => !srcAssets.includes(f));
  if (extra.length) bad(`extra files in dist/assets: ${extra.join(', ')}`);
  if (failures === f0) ok(`${n} files identical`);
}

// 8. CSP -------------------------------------------------------------------------------
section('8. _headers and vercel.json carry the same CSP');
{
  const fromHeaders = (rd(path.join(DIST, '_headers')).match(/Content-Security-Policy: (.*)/) || [])[1];
  const vj = JSON.parse(rd(path.join(ROOT, 'vercel.json')));
  const fromVercel = vj.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value;
  if (!fromHeaders || !fromVercel) bad('CSP missing from _headers or vercel.json');
  else if (fromHeaders !== fromVercel) bad('CSP differs between _headers and vercel.json');
  else ok('identical');
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
