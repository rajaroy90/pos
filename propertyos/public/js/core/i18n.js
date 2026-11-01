// Translations: English is always loaded, Hindi is fetched on demand.
// Strings can use {vars}. A "one|other" pair is chosen by vars.n (1 → first).
import { S } from './store.js';
import { EN } from './strings.en.js';

let HI = null;

export async function loadLang(lang) {
  if (lang === 'hi' && !HI) {
    try { HI = (await import('./strings.hi.js')).HI; } catch { HI = {}; }
  }
}

export function detectLang() {
  const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^hi\b/i.test(l) ? 'hi' : 'en';
}

export function t(key, vars) {
  let s = (S.prefs.lang === 'hi' && HI && HI[key]) || EN[key];
  if (s === undefined) return key;
  if (vars) {
    if (s.includes('|') && typeof vars.n === 'number') {
      const parts = s.split('|');
      s = vars.n === 1 ? parts[0] : parts[1] || parts[0];
    }
    s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : String(vars[k])));
  }
  return s;
}

export const hasKey = (k) => k in EN;
