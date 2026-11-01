/* PropertyOS module 2: Glass lab 3 (tint, appearance, refraction height), live KPIs, backups. Loads after upgrade.js; free-tier safe. */
(() => {
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const AC = [['', 'Blue'], ['#30b94d', 'Green'], ['#ff8a1f', 'Orange'], ['#af52de', 'Purple'], ['#ff2d78', 'Pink']];
  const TH = [['', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
  const css = document.createElement('style');
  css.textContent = `
.g {
  box-shadow: inset 1.5px 1.5px 0 rgba(255,255,255,.55), inset -1px -1px 0 rgba(255,255,255,.14), inset 0 0 26px rgba(255,255,255,.08), 0 14px 44px var(--sh);
}

/* Primary liquid buttons are defined in 01-glass-engine; keep chromatic lens accents */
.lens {
  box-shadow:
    inset 0 0 0 1px var(--gb),
    inset 3px 0 8px rgba(70,160,255,.28),
    inset -3px 0 8px rgba(255,110,190,.24),
    inset 0 2px 12px rgba(255,255,255,.55),
    0 6px 18px var(--sh);
}

header {
  position: sticky;
  top: 0;
  z-index: 4;
  padding: 8px;
  margin: 0 -8px 14px;
  border-radius: 26px;
  transition: background .3s, box-shadow .3s;
}

header.sc {
  background: var(--gl);
  backdrop-filter: blur(22px) saturate(1.8);
  -webkit-backdrop-filter: blur(22px) saturate(1.8);
  box-shadow: inset 0 1px 0 var(--fl), 0 10px 30px var(--sh);
}

.seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 99px;
  background: var(--fl);
  margin: 6px 0 14px;
}

.seg button {
  flex: 1;
  border: 0;
  border-radius: 99px;
  padding: 8px 0;
  font-weight: 600;
  font-size: 13px;
  font-family: inherit;
  color: var(--tx);
  background: none;
  cursor: pointer;
  transition: background .3s, transform .3s cubic-bezier(.3,1.6,.5,1);
}

.seg button.on {
  background: var(--gl);
  box-shadow: inset 0 0 0 1px var(--gb), 0 3px 10px var(--sh);
}

.seg button:active {
  transform: scale(.94);
}

.sw2 {
  display: flex;
  gap: 12px;
  margin: 6px 0 14px;
}

.sw2 button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--gb);
  cursor: pointer;
  box-shadow: inset 0 2px 4px rgba(255,255,255,.6), 0 3px 8px var(--sh);
  transition: transform .3s cubic-bezier(.3,1.6,.5,1);
}

.sw2 button.on {
  outline: 2px solid var(--tx);
  outline-offset: 2px;
  transform: scale(1.12);
}
`;
  document.head.append(css);
  /* Glass lab: appearance + tint controls (state lives in upgrade.js via window.GLASS) */
  window.GL2 = () => {
    const G = GLASS.G;
    return `<small style="color:var(--mu);font-weight:600">Appearance</small><div class="seg">${TH.map(([v, n]) => `<button data-th="${v}" class="${(G.th || '') == v ? 'on' : ''}">${n}</button>`).join('')}</div><small style="color:var(--mu);font-weight:600">Tint</small><div class="sw2">${AC.map(([v, n]) => `<button aria-label="${n}" data-ac="${v}" class="${(G.ac || '') == v ? 'on' : ''}" style="background:${v || '#0a84ff'}"></button>`).join('')}</div>`;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-th],[data-ac]');
    if (!b)
      return;
    const { G, ap } = GLASS;
    if (b.dataset.th != null) {
      G.th = b.dataset.th;
      if (!G.th) {
        delete document.documentElement.dataset.theme;
        ls('po-theme', '');
      }
    }
    if (b.dataset.ac != null)
      G.ac = b.dataset.ac;
    ap();
    b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x == b));
  });
  /* Home: at-a-glance KPIs */
  const _h = V.home;
  V.home = () => {
    const h = _h();
    if (!mgr())
      return h;
    const ac = LS().filter(l => l.st == 'active');
    const ex = sum(ac, l => l.rent);
    const od = sum(D.charges.filter(c => st(c) == 'Overdue'), c => bal(c));
    const oc = D.units.length ? Math.round(new Set(ac.map(l => l.uid)).size / D.units.length * 100) : 0;
    return h.replace('<h2>Cash flow · 12 months</h2>', `<h2>At a glance</h2><div class="grid"><div class="g k"><small>Expected monthly rent</small><b data-n="${ex}" data-p="₹">0</b></div><div class="g k"><small>Overdue now</small><b data-n="${od}" data-p="₹" style="color:${od ? 'var(--er)' : 'var(--ok)'}">0</b></div><div class="g k"><small>Occupancy</small><b data-n="${oc}" data-s="%">0</b></div></div><h2>Cash flow · 12 months</h2>`);
  };
  /* Backup + expenses CSV */
  const dl = (n, t, m) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: m }));
    a.download = n;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
  };
  A.bak = () => {
    dl(`propertyos-backup-${TD}.json`, JSON.stringify(D, null, 1), 'application/json');
    toast('Backup saved');
  };
  A.expcsv = () => {
    if (!D.exp.length)
      return toast('No expenses yet');
    const q = v => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s))
        s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    dl(`expenses-${TD}.csv`, 'Date,Property,Category,Amount,Note\n' + D.exp.map(x => {
      const p = g('props', x.pid);
      return [x.at, p ? p.name : 'General', x.cat, x.amt, x.note].map(q).join(',');
    }).join('\n'), 'text/csv');
    toast('Expenses exported');
  };
  const _s = V.set;
  V.set = () => _s().replace('data-a="glass">Glass lab</button>', 'data-a="glass">Glass lab</button>' + (mgr() ? '<button class="btn q" data-a="bak">Backup</button>' : ''));
  const _e = V.exp;
  V.exp = () => _e().replace('<button class="btn" data-a="addExp">+ Expense</button>', '<button class="btn" data-a="addExp">+ Expense</button><button class="btn q" data-a="expcsv">Export CSV</button>');
  /* Feel: haptics + glass header on scroll */
  document.addEventListener('click', e => {
    if (e.target.closest('button,.row,.pill') && navigator.vibrate)
      navigator.vibrate(6);
  }, true);
  const hd = document.querySelector('header');
  addEventListener('scroll', () => hd.classList.toggle('sc', scrollY > 6), { passive: true });
  if (document.body.classList.contains('ready'))
    render();
})();
