// Lists every file in public/ into the service worker's precache and bumps its cache name,
// so a new deploy replaces the old offline copy. Run before committing: node dev/stamp.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('../public/', import.meta.url).pathname;
const skip = new Set(['sw.js', '_headers']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (!skip.has(relative(root, p))) files.push('/' + relative(root, p));
  }
})(root);

const hash = createHash('sha256');
for (const f of files) { hash.update(f); hash.update(readFileSync(join(root, f))); }
const version = hash.digest('hex').slice(0, 10);
const list = ['/', ...files.filter((f) => f !== '/index.html'), '/index.html'];

const swPath = join(root, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'propertyos-${version}';`);
sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = ${JSON.stringify(list, null, 2)};`);
writeFileSync(swPath, sw);
console.log(`sw.js: ${list.length} files, cache propertyos-${version}`);
