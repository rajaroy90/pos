// Optional app lock. The PIN never leaves this phone: it only guards the screen, the server session is separate.
import { h, $ } from '../core/h.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { haptic } from '../core/fx.js';

const K = 'po:pin';
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((x) => parseInt(x, 16)));

async function derive(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 60000, salt }, base, 256));
}

export const hasPin = () => { try { return !!localStorage.getItem(K); } catch { return false; } };
export function clearPin() { try { localStorage.removeItem(K); } catch { /* ignore */ } }

export async function setPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(K, JSON.stringify({ s: hex(salt), h: await derive(pin, salt) }));
}

export async function checkPin(pin) {
  try {
    const { s, h: want } = JSON.parse(localStorage.getItem(K));
    return (await derive(pin, unhex(s))) === want;
  } catch { return false; }
}

/** Numeric keypad that collects `len` digits, then calls onDone(pin) → Promise<boolean ok>. */
export function PinPad({ len = 4, onDone, solid = false, title, sub, resetAfter = false }) {
  let val = '';
  let locked = false;
  const dots = h('div', { class: 'dots' }, Array.from({ length: len }, () => h('i')));
  const subEl = h('div', { class: 'lock-sub' }, sub || '');
  const sync = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < val.length));
  const press = async (d) => {
    if (locked || val.length >= len) return;
    haptic();
    val += d; sync();
    if (val.length === len) {
      locked = true;
      const ok = await onDone(val);
      if (!ok) {
        haptic('error');
        dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
        setTimeout(() => { val = ''; sync(); locked = false; }, 380);
      } else if (resetAfter) {
        setTimeout(() => { val = ''; sync(); locked = false; }, 200);
      } else { locked = false; }
    }
  };
  const back = () => { if (locked) return; val = val.slice(0, -1); sync(); };
  const keyBtn = (d, letters = '') => h('button', { class: 'key press', type: 'button', 'aria-label': d, onClick: () => press(d) }, d, letters ? h('small', null, letters) : null);
  const letters = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };
  const pad = h('div', { class: `keypad ${solid ? 'solid' : ''}` },
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => keyBtn(String(d), letters[d])),
    h('div', { class: 'key blank' }), keyBtn('0'),
    h('button', { class: 'key txt press', type: 'button', 'aria-label': t('common.back'), onClick: back }, icon('left', 24)));
  const onKey = (e) => {
    if (!pad.isConnected) { window.removeEventListener('keydown', onKey); return; }
    if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') back();
  };
  window.addEventListener('keydown', onKey);
  return {
    el: h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: '1' } },
      title ? h('div', { class: 'lock-title' }, title) : null, subEl, dots, pad),
    setSub: (s) => { subEl.textContent = s; },
  };
}

/** Full-screen lock over the whole OS. Resolves when unlocked (or the person chooses to sign out). */
export function showLock({ onForgot }) {
  return new Promise((resolve) => {
    const os = $('.os');
    let fails = 0;
    let blockedUntil = 0;
    const pad = PinPad({
      title: t('pin.enter'),
      sub: '',
      onDone: async (pin) => {
        const now = Date.now();
        if (now < blockedUntil) { pad.setSub(t('pin.wait', { s: Math.ceil((blockedUntil - now) / 1000) })); return false; }
        if (await checkPin(pin)) { el.style.transition = 'opacity 240ms, transform 240ms'; el.style.opacity = '0'; el.style.transform = 'scale(1.06)'; setTimeout(() => { el.remove(); resolve(true); }, 240); return true; }
        fails++;
        if (fails >= 5) { blockedUntil = now + Math.min(300, 15 * 2 ** (fails - 5)) * 1000; pad.setSub(t('pin.wait', { s: Math.ceil((blockedUntil - now) / 1000) })); } else pad.setSub(t('pin.wrong'));
        return false;
      },
    });
    const el = h('div', { class: 'lock', role: 'dialog', 'aria-label': t('pin.enter') },
      h('div', { class: 'wall' }),
      icon('lock', 34),
      pad.el,
      h('button', { class: 'key txt press', type: 'button', style: { width: 'auto', height: '44px', marginTop: '10px', padding: '0 16px' }, onClick: () => { el.remove(); resolve(false); onForgot(); } }, t('pin.forgot')));
    os.append(el);
  });
}
