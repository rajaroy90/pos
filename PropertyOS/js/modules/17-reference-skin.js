/* 17 · Reference skin
   Swaps the line-icon glyphs inside .ic badges for the glossy 3D tiles from assets/ico (cut from the 50-icon sheet),
   and adds the press-to-magnify behaviour on the tab bar lens. Removing the `rf` class on <html> restores the old look. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('rf');

  /* icon key (see P / SEC in core) -> tile number in assets/ico */
  const TILE = {
    home: 0, props: 1, tenants: 2, pay: 3, wallet: 4, card: 4, leases: 12, lease: 12, agreements: 12, dep: 13, deposits: 13,
    maint: 7, repairs: 7, inq: 20, chat: 20, set: 9, settings: 9, utils: 32, bills: 32, docs: 42, files: 42,
    reports: 30, growth: 30, team: 36, ledger: 31, bank: 31, bell: 21, notif: 21, cal: 15, calendar: 15, map: 10,
    lock: 38, security: 38, backup: 39, sync: 39, palette: 40, appearance: 40, brand: 41, sparkle: 44, ai: 44,
    more: 45, plus: 46, add: 46, sliders: 47, link: 48, info: 49, tax: 33, pie: 34, receipt: 32, key: 13
  };
  /* custom glyphs (no path in P): match on the visible label instead */
  const LABEL = { reminders: 25, expenses: 34, ledger: 31, wallet: 4, repairs: 7, agreements: 12, deposits: 13, utilities: 32,
    reports: 30, team: 36, settings: 9, inquiries: 20, tenants: 2, leases: 12, properties: 1, rent: 3, home: 0, more: 45 };
  const pad = n => String(n).padStart(2, '0');
  const sig = d => (d || '').replace(/\s+/g, '').slice(0, 28);

  /* path signature -> tile url, built once from the core icon map */
  const SIG = {};
  try {
    if (typeof P === 'object') {
      Object.keys(P).forEach(k => {
        if (TILE[k] !== undefined) SIG[sig(P[k].split('M').filter(Boolean).map(s => 'M' + s)[0])] = 'assets/ico/' + pad(TILE[k]) + '.webp';
      });
    }
  } catch (e) { /* core map unavailable: leave glyphs alone */ }

  let queued = false;
  function swap() {
    queued = false;
    tabs();
    document.querySelectorAll('.ic:not([data-rs])').forEach(el => {
      el.dataset.rs = '1';
      const p = el.querySelector('svg path');
      let url = p && SIG[sig(p.getAttribute('d'))];
      if (!url) {
        const t = el.closest('.lq-tile, .tg8, .g.row');
        const lab = t && (t.querySelector('span, b, small') || t).textContent.trim().toLowerCase().replace(/[^a-z ]/g, '').trim();
        if (lab && LABEL[lab] !== undefined) url = 'assets/ico/' + pad(LABEL[lab]) + '.webp';
      }
      if (!url) return;
      el.classList.add('ic-t');
      el.innerHTML = '<img src="' + url + '" alt="" width="96" height="96" decoding="async" draggable="false">';
    });
  }
  function tabs() {
    document.querySelectorAll('nav.tb button:not([data-rt])').forEach(b => {
      b.dataset.rt = '1';
      const svg = b.querySelector('svg');
      const key = (b.dataset.v || '').toLowerCase();
      const lab = b.textContent.trim().toLowerCase();
      const n = TILE[key] !== undefined ? TILE[key] : LABEL[lab];
      if (!svg || n === undefined) return;
      svg.outerHTML = '<img class="tbi" src="assets/ico/' + pad(n) + '.webp" alt="" width="62" height="62" decoding="async" draggable="false">';
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(swap); } };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  queue();

  /* tab bar: lens grows and shows colour fringing while pressed */
  const down = e => { const tb = e.target.closest && e.target.closest('nav.tb'); if (tb) tb.classList.add('press'); };
  const up = () => { const tb = document.getElementById('tb'); if (tb) tb.classList.remove('press'); };
  document.addEventListener('pointerdown', down, { passive: true });
  ['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, up, { passive: true }));
})();
