// Verifies every t('key') used in the code exists in English, and every English key exists in Hindi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/js');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && !/strings\./.test(f) && files.push(p); } })(root);
const used = new Map();
const dyn = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([^']+)'/g)) used.set(m[1], f);
  for (const m of s.matchAll(/\bt\(\s*`([^`]+)`/g)) dyn.add(m[1]);
}
const { EN } = await import(pathToFileURL(path.join(root, 'core/strings.en.js')));
let HI = {};
try { ({ HI } = await import(pathToFileURL(path.join(root, 'core/strings.hi.js')))); } catch { console.log('(no Hindi file yet)'); }
const roles = ['landlord', 'tenant', 'guard'];
const statuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
const kinds = ['rent_claim', 'rent_confirmed', 'rent_rejected', 'ticket_new', 'ticket_comment', 'ticket_status', 'visitor_arrived', 'visitor_request', 'tenant_joined', 'guard_joined'];
const extra = [...roles.map((r) => `role.${r}`), ...statuses.map((s) => `ts.${s}`), ...kinds.flatMap((k) => [`n.${k}.t`, `n.${k}.s`])];
const missingEn = [...used.keys()].filter((k) => !(k in EN));
const missingEx = extra.filter((k) => !(k in EN));
const missingHi = Object.keys(EN).filter((k) => !(k in HI));
const unused = Object.keys(EN).filter((k) => !used.has(k) && !extra.includes(k));
console.log('dynamic key templates seen:', [...dyn].join(' | '));
console.log('static keys used:', used.size, ' EN keys:', Object.keys(EN).length, ' HI keys:', Object.keys(HI).length);
if (missingEn.length) console.log('MISSING in EN (used in code):\n  ' + missingEn.map((k) => `${k}  (${path.relative(root, used.get(k))})`).join('\n  '));
if (missingEx.length) console.log('MISSING in EN (dynamic):\n  ' + missingEx.join('\n  '));
if (Object.keys(HI).length && missingHi.length) console.log('MISSING in HI:\n  ' + missingHi.join('\n  '));
if (process.argv.includes('--unused') && unused.length) console.log('UNUSED EN keys:\n  ' + unused.join('\n  '));
process.exitCode = missingEn.length || missingEx.length || (Object.keys(HI).length && missingHi.length) ? 1 : 0;
