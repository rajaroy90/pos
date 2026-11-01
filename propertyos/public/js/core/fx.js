// Effects: spring curves, glass quality tiers, haptics, tiny sounds.
import { S, setPrefs, emit } from './store.js';

// ---------- springs → CSS linear() ----------
/** Damped spring response from 0 → 1. Returns { css, ms } for use as an easing + duration. */
export function springCurve({ stiffness = 170, damping = 15, mass = 1 } = {}, points = 36) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x = (tt) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * tt) * (Math.cos(wd * tt) + ((zeta * w0) / wd) * Math.sin(wd * tt));
    }
    return 1 - Math.exp(-w0 * tt) * (1 + w0 * tt);
  };
  let end = 0.1;
  for (let tt = 0.1; tt < 3; tt += 0.02) if (Math.abs(1 - x(tt)) > 0.002) end = tt + 0.02;
  const pts = [];
  for (let i = 0; i <= points; i++) pts.push(Math.round(x((end * i) / points) * 1000) / 1000);
  pts[points] = 1;
  return { css: `linear(${pts.join(', ')})`, ms: Math.round(end * 1000) };
}

export function applySprings() {
  try {
    if (!CSS.supports('transition-timing-function', 'linear(0, 1)')) return;
  } catch { return; }
  const root = document.documentElement.style;
  const pop = springCurve({ stiffness: 320, damping: 19, mass: 1 });
  const smooth = springCurve({ stiffness: 260, damping: 30, mass: 1 });
  root.setProperty('--spring', pop.css);
  root.setProperty('--spring-t', `${Math.min(900, pop.ms)}ms`);
  root.setProperty('--smooth', smooth.css);
  root.setProperty('--smooth-t', `${Math.min(700, smooth.ms)}ms`);
}

// ---------- glass tiers ----------
// Only Chromium (Chrome, Edge, Samsung Internet, Opera: all say "Chrome/") can use SVG filters inside backdrop-filter.
// iOS browsers say "CriOS" and run WebKit, so they correctly fail this test.
const isChromium = () => /Chrome\/\d+/.test(navigator.userAgent);
export const refractionSupported = () => isChromium() && 'CSS' in window && CSS.supports('backdrop-filter', 'url(#a) blur(1px)');

export function autoTier() {
  if (!CSS.supports('backdrop-filter', 'blur(2px)') && !CSS.supports('-webkit-backdrop-filter', 'blur(2px)')) return 0;
  if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return 0;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return 0;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return 0;
  return S.prefs.glassAuto === 0 ? 0 : 1;
}

export function effectiveTier() {
  const p = S.prefs.glass;
  if (p === 'auto') return autoTier();
  const n = Number(p);
  if (n === 2 && !refractionSupported()) return 1;
  return n;
}

export function applyGlass() {
  const tier = effectiveTier();
  document.documentElement.dataset.glass = String(tier);
  if (tier === 2) import('../shell/refract.js').then((m) => m.ensureRefract()).catch(() => {});
  emit('glass');
}

/** Measure real frame times for ~1.2 s once. Slow phones silently fall back to solid glass. */
export function probeFrames() {
  if (S.prefs.glass !== 'auto' || S.prefs.probed || effectiveTier() === 0) return;
  let last = 0; let count = 0; let total = 0;
  const step = (ts) => {
    if (document.hidden) { requestAnimationFrame(step); return; }
    if (last) { count++; if (count > 6) total += ts - last; }
    last = ts;
    if (count < 40) { requestAnimationFrame(step); return; }
    const avg = total / (count - 6);
    setPrefs({ probed: true, glassAuto: avg > 28 ? 0 : 1 });
    applyGlass();
  };
  requestAnimationFrame(step);
}

// ---------- theme ----------
export function applyTheme() {
  document.documentElement.dataset.theme = S.prefs.theme;
  const dark = S.prefs.theme === 'dark' || (S.prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0b111b' : '#0b2a66';
}

// ---------- haptics & sound ----------
export function haptic(kind = 'tap') {
  if (!S.prefs.haptics || !navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
  try { navigator.vibrate(kind === 'success' ? [12, 40, 18] : kind === 'error' ? [30, 40, 30] : 9); } catch { /* ignore */ }
}

let ac = null;
export function sound(kind = 'tap') {
  if (!S.prefs.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    const t0 = ac.currentTime;
    const f = { tap: [520, 640], success: [660, 990], error: [260, 190], open: [420, 560] }[kind] || [520, 640];
    o.type = 'sine';
    o.frequency.setValueAtTime(f[0], t0);
    o.frequency.exponentialRampToValueAtTime(f[1], t0 + 0.09);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + 0.18);
  } catch { /* audio not available */ }
}

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
