/* PropertyOS module 1: Liquid Glass 2 + new features. Loads after the main script; no new services (free-tier safe). */
(() => {
  const Q = s => document.querySelector(s);
  const G = Object.assign({
    on: 1, r: 28, b: 6, ca: 30, h: 30, th: '', ac: ''
  }, (() => {
    try {
      return JSON.parse(ls('po-glass') || '{}');
    }
    catch (e) {
      return {};
    }
  })());
  const chrome = !!window.chrome && CSS.supports('backdrop-filter', 'url(#a)');
  /* ---------- Liquid glass: SVG refraction (Chromium); frosted fallback elsewhere ---------- */
  const mm = bv => {
    const w = 256;
    const h = 96;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const im = x.createImageData(w, h);
    const r = h / 2;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const px = i + .5;
        const py = j + .5;
        const cx = Math.min(Math.max(px, r), w - r);
        const dx = px - cx;
        const dy = py - r;
        const d = Math.hypot(dx, dy) || 1;
        const e = r - d;
        let sx = 0;
        let sy = 0;
        if (e < bv) {
          const s = Math.pow(1 - Math.max(e, 0) / bv, 2);
          sx = -dx / d * s;
          sy = -dy / d * s;
        }
        const k = (j * w + i) * 4;
        im.data[k] = 128 + sx * 127;
        im.data[k + 1] = 128 + sy * 127;
        im.data[k + 2] = 128;
        im.data[k + 3] = 255;
      }
    x.putImageData(im, 0, 0);
    return c.toDataURL();
  };
  const cm = a => `<feColorMatrix in="${a[0]}" values="${a[1].join(' ')}" result="${a[2]}"/>`;
  const mkf = () => {
    let s = Q('#lgsvg');
    if (!s) {
      s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.id = 'lgsvg';
      s.setAttribute('width', 0);
      s.setAttribute('height', 0);
      s.style.cssText = 'position:absolute;pointer-events:none';
      document.body.append(s);
    }
    const r = G.r;
    const a = G.ca / 100;
    const dp = (n, k) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${(r * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="${n}"/>`;
    s.innerHTML = `<filter id="lgf" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="${mm(G.h)}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="m"/>${dp('d1', 1)}${cm(['d1', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'r'])}${dp('d2', 1 + a)}${cm(['d2', [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'g'])}${dp('d3', 1 + 2 * a)}${cm(['d3', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], 'b'])}<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>`;
  };
  const ap = () => {
    document.documentElement.classList.toggle('lgx', !!(chrome && G.on));
    document.documentElement.style.setProperty('--lgb', G.b + 'px');
    G.th && (document.documentElement.dataset.theme = G.th, ls('po-theme', G.th));
    G.ac ? document.documentElement.style.setProperty('--ac', G.ac) : document.documentElement.style.removeProperty('--ac');
    mkf();
    ls('po-glass', JSON.stringify(G));
  };
  const css = document.createElement('style');
  css.textContent = `
.bl i:nth-child(4) {
  background: var(--c1);
  right: 5vmax;
  bottom: -18vmax;
  animation-delay: -4s;
  opacity: .55;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .07;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.g {
  box-shadow: inset 0 1.5px 0 var(--fl), inset 0 -1px 0 rgba(255,255,255,.1), inset 0 0 22px rgba(255,255,255,.07), 0 12px 40px var(--sh);
}

.g.row,
.g.k {
  background-image: radial-gradient(220px circle at var(--mx,-999px) var(--my,-999px),rgba(255,255,255,.3),transparent 60%), linear-gradient(135deg,rgba(255,255,255,.22),transparent 38%,transparent 72%,rgba(255,255,255,.1));
}

/* Hero keeps its own surface (no shared specular) so tail-light can own the focus */
.g.hero {
  background-image: linear-gradient(145deg,rgba(255,255,255,.16),transparent 42%,transparent 70%,rgba(255,255,255,.08));
  overflow: hidden;
}

/* —— Liquid buttons (banner: Surface + Tinted) —— */
.btn {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.btn:not(.q):not(.d) {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--ac, #0a84ff) 55%, #fff),
    color-mix(in srgb, var(--ac, #0a84ff) 88%, transparent));
  backdrop-filter: blur(12px) saturate(1.7);
  -webkit-backdrop-filter: blur(12px) saturate(1.7);
  border: 1px solid rgba(255,255,255,.45);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.65),
    inset 0 -6px 14px color-mix(in srgb, var(--ac, #0a84ff) 35%, transparent),
    0 8px 22px color-mix(in srgb, var(--ac, #0a84ff) 40%, transparent);
}
.btn.d {
  background: linear-gradient(180deg, rgba(255,120,108,.95), rgba(239,59,48,.88));
  border: 1px solid rgba(255,255,255,.35);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.55),
    inset 0 -6px 14px rgba(180,30,20,.35),
    0 8px 22px rgba(239,59,48,.35);
}
.btn.q {
  background: linear-gradient(160deg, rgba(255,255,255,.42), rgba(255,255,255,.12));
  color: var(--tx);
  border: 1px solid rgba(255,255,255,.38);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.7),
    inset 0 -1px 0 rgba(255,255,255,.12),
    0 6px 18px var(--sh);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
}
.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,.35), transparent 40%, transparent 70%, rgba(255,255,255,.12));
  pointer-events: none;
  mix-blend-mode: soft-light;
}

.sh::before {
  content: '';
  display: block;
  width: 38px;
  height: 5px;
  border-radius: 9px;
  background: var(--mu);
  opacity: .35;
  margin: -8px auto 14px;
}

.ac {
  flex-wrap: wrap;
}

.ac .btn {
  min-width: 120px;
}

#tb {
  touch-action: pan-y;
}

/* —— Dock / tab bar (banner glass tabs) —— */
nav.tb {
  background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.1));
  border: 1px solid rgba(255,255,255,.32);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.55),
    inset 0 -1px 0 rgba(255,255,255,.08),
    0 12px 36px var(--sh);
  backdrop-filter: blur(28px) saturate(1.85);
  -webkit-backdrop-filter: blur(28px) saturate(1.85);
}
.lens {
  background: linear-gradient(160deg, rgba(255,255,255,.55), rgba(255,255,255,.22));
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.5),
    inset 0 2px 12px rgba(255,255,255,.55),
    inset 0 -5px 12px rgba(255,255,255,.15),
    0 6px 18px var(--sh);
  backdrop-filter: brightness(1.22) saturate(1.6);
  -webkit-backdrop-filter: brightness(1.22) saturate(1.6);
}
.lens.dg {
  transition: transform .12s linear;
  filter: brightness(1.14);
}

/* Liquid refraction on chrome surfaces (not hero) */
.lgx nav.tb,
.lgx .pill.g,
.lgx .rcb,
.lgx .btn.q,
.lgx .ch .pill,
.lgx .seg,
.lgx .sw i {
  backdrop-filter: url(#lgf) blur(var(--lgb)) saturate(1.9);
  -webkit-backdrop-filter: url(#lgf) blur(var(--lgb)) saturate(1.9);
}

.g2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 14px;
  font-weight: 600;
}

/* —— Liquid switch (banner capsule) —— */
.sw {
  position: relative;
  width: 68px;
  height: 36px;
  margin: 0;
  flex: none;
}

.sw input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  z-index: 2;
  cursor: pointer;
  border: 0;
}

.sw i {
  position: absolute;
  inset: 0;
  border-radius: 99px;
  background: linear-gradient(180deg, rgba(120,120,128,.42), rgba(90,90,100,.35));
  transition: background .35s, box-shadow .35s;
  box-shadow:
    inset 0 1.5px 4px rgba(0,0,0,.28),
    inset 0 -1px 0 rgba(255,255,255,.12),
    0 1px 0 rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.18);
  overflow: hidden;
}

.sw i::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 42px;
  height: 28px;
  border-radius: 99px;
  background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,.88) 100%);
  box-shadow:
    0 4px 12px rgba(0,0,0,.28),
    inset 0 1.5px 0 #fff,
    inset 0 -2px 4px rgba(140,160,200,.25);
  transition: transform .5s cubic-bezier(.3,1.5,.5,1), width .2s, box-shadow .3s;
}

.sw input:checked+i {
  background: linear-gradient(180deg, #34d399, #10b981);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.45),
    inset 0 -2px 6px rgba(0,100,60,.25),
    0 0 18px rgba(16,185,129,.45);
}

.sw input:checked+i::after {
  transform: translateX(20px);
  box-shadow:
    0 4px 14px rgba(0,80,50,.3),
    inset 0 1.5px 0 #fff,
    0 0 10px rgba(255,255,255,.5);
}

.sw input:active+i::after {
  width: 48px;
}

.sw input:checked:active+i::after {
  transform: translateX(14px);
}

/* v3 Liquid Glass slider (banner control-panel style) + panel */
input.rg2 {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 32px;
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
  display: block;
  cursor: pointer;
}
input.rg2::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 99px;
  background: linear-gradient(
    90deg,
    var(--ac) var(--p, 50%),
    rgba(120, 120, 128, 0.28) var(--p, 50%)
  );
  box-shadow: inset 0 1px 2px rgba(0,0,0,.18);
}
input.rg2::-moz-range-track {
  height: 8px;
  border-radius: 99px;
  background: rgba(120, 120, 128, 0.28);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.18);
}
input.rg2::-moz-range-progress {
  height: 8px;
  border-radius: 99px;
  background: var(--ac);
}
input.rg2::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 40px;
  height: 26px;
  margin-top: -9px;
  border-radius: 99px;
  background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,.85) 100%);
  box-shadow:
    0 5px 14px rgba(0, 0, 0, 0.28),
    inset 0 1.5px 0 #fff,
    inset 0 -3px 6px rgba(120, 140, 180, 0.3);
  border: 1px solid rgba(255,255,255,.6);
}
input.rg2::-moz-range-thumb {
  width: 40px;
  height: 26px;
  border-radius: 99px;
  background: linear-gradient(180deg, #fff, rgba(255,255,255,.9));
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255,255,255,.6);
}
html[data-theme="dark"] input.rg2::-webkit-slider-runnable-track {
  background: linear-gradient(
    90deg,
    var(--ac) var(--p, 50%),
    rgba(120, 120, 128, 0.42) var(--p, 50%)
  );
}
.lg-panel {
  margin: 12px 0 16px;
  padding: 20px 18px 14px;
  border-radius: 28px;
  background: linear-gradient(
    160deg,
    rgba(200, 235, 255, 0.55),
    rgba(150, 200, 255, 0.3) 50%,
    rgba(170, 210, 255, 0.22)
  );
  backdrop-filter: blur(40px) saturate(1.9);
  -webkit-backdrop-filter: blur(40px) saturate(1.9);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.75),
    inset 0 -1px 0 rgba(255,255,255,.12),
    0 16px 48px rgba(40, 90, 150, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.lg-panel label.lg-sl {
  display: block;
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 650;
  color: var(--mu);
}
.lg-panel label.lg-sl:last-child {
  margin-bottom: 2px;
}
.lg-panel label.lg-sl span {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--tx);
  font-weight: 500;
  font-size: 14px;
}
.lg-panel label.lg-sl b {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 12px;
  color: var(--mu);
}
html[data-theme="dark"] .lg-panel,
.dark .lg-panel {
  background: linear-gradient(160deg, rgba(70, 120, 180, 0.4), rgba(30, 55, 95, 0.3));
  border-color: rgba(255, 255, 255, 0.12);
}


.dr {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: dw 1.6s .3s cubic-bezier(.2,.9,.3,1) forwards;
}

@keyframes dw {
  to {
  stroke-dashoffset: 0;
  }
}
`;
  document.head.append(css);
  document.querySelector('.bl').append(document.createElement('i'));
  addEventListener('pointermove', e => {
    if (e.pointerType != 'mouse')
      return;
    const t = e.target.closest && e.target.closest('.g');
    if (t) {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', e.clientX - r.left + 'px');
      t.style.setProperty('--my', e.clientY - r.top + 'px');
    }
  }, { passive: true });
  const fillRg = el => {
    if (!el || el.type !== 'range') return;
    const min = +el.min || 0, max = +el.max || 100, val = +el.value;
    const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    el.style.setProperty('--p', pct + '%');
  };
  document.addEventListener('input', e => {
    const t = e.target;
    const k = t.dataset && t.dataset.g;
    if (!k)
      return;
    G[k] = t.type == 'checkbox' ? +t.checked : +t.value;
    const o = Q('#gv' + k);
    o && (o.textContent = t.value);
    fillRg(t);
    ap();
  });
  /* draggable glass lens on the tab bar */
  {
    const tb = Q('#tb');
    let dr = null;
    tb.addEventListener('pointerdown', e => {
      if (tb.querySelector('.lens'))
        dr = {
          x: e.clientX, m: 0, r: tb.getBoundingClientRect(), i: 0
        };
    });
    addEventListener('pointermove', e => {
      if (!dr)
        return;
      if (!dr.m && Math.abs(e.clientX - dr.x) < 8)
        return;
      dr.m = 1;
      const n = tb.querySelectorAll('button').length;
      const w = (dr.r.width - 12) / n;
      dr.i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - dr.r.left - 6) / w)));
      const L = tb.querySelector('.lens');
      L.classList.add('dg');
      L.style.transform = `translateX(${dr.i * 100}%) scale(1.12)`;
    });
    addEventListener('pointerup', () => {
      if (!dr)
        return;
      const d = dr;
      dr = null;
      const L = tb.querySelector('.lens');
      L && L.classList.remove('dg');
      if (d.m) {
        const b = tb.querySelectorAll('button')[d.i];
        b && b.click();
        addEventListener('click', ev => ev.stopPropagation(), { capture: true, once: true });
      }
    });
    addEventListener('pointercancel', () => {
      dr = null;
    });
  }
  A.glass = () => {
    modal(`<h3>Liquid Glass</h3>
<div class="g2"><span>Backdrop refraction</span><label class="sw"><input type="checkbox" data-g="on" ${G.on ? 'checked' : ''}><i></i></label></div>
<div class="lg-panel">
${[['h', 'Refraction height', 8, 48], ['r', 'Refraction amount', 0, 60], ['ca', 'Chromatic aberration', 0, 100]].map(([k, n, a, b]) => {
  const pct = ((G[k] - a) / (b - a)) * 100;
  return `<label class="lg-sl"><span>${n}</span><input class="rg2" type="range" min="${a}" max="${b}" value="${G[k]}" data-g="${k}" style="--p:${pct}%"></label>`;
}).join('')}
</div>
${typeof GL2 === 'function' ? GL2() : ''}
<p style="color:var(--mu);font-size:13px">${chrome ? 'Refraction bends what is behind the tab bar, header pills and glass surfaces — like the liquid glass control panel.' : 'Full refraction needs Chrome, Edge or Android. This browser uses frosted glass.'}</p>
<button class="btn" data-x style="width:100%">Done</button>`);
    requestAnimationFrame(() => document.querySelectorAll('.lg-panel input.rg2').forEach(fillRg));
    fillAllRanges();
  };
  /* ---------- Expenses ---------- */
  const CATS = ['Repairs', 'Utilities', 'Tax', 'Insurance', 'Salary', 'Cleaning', 'Other'];
  D.exp = [];
  D.expOk = 0;
  CFA = 1;
  var CFA;
  const _load = load;
  load = async () => {
    await _load();
    if (!mgr())
      return;
    try {
      let o = [];
      let f = 0;
      for (;;) {
        const x = await sb.from('expenses').select('*').eq('org_id', ORG).order('spent_on', { ascending: false }).range(f, f + 999);
        if (x.error)
          throw x.error;
        o = o.concat(x.data);
        if (x.data.length < 1000)
          break;
        f += 1000;
      }
      D.exp = o.map(x => ({
        id: x.id, pid: x.property_id, cat: x.category, amt: x.amount / 100, note: x.note, at: x.spent_on
      }));
      D.expOk = 1;
    }
    catch (e) {
      D.exp = [];
      D.expOk = 0;
    }
  };
  const _go = go;
  go = v => {
    CFA = 1;
    _go(v);
  };
  P.exp = 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6';
  SEC.exp = ['Expenses', '#ff6b35'];
  MORE.splice(1, 0, 'exp');
  const ym = s => String(s).slice(0, 7);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  V.exp = () => {
    if (!D.expOk)
      return empty('Expenses need one database update: run <b>supabase/migrations/007_expenses.sql</b> in the Supabase SQL editor, then reload.');
    const m12 = mk(-11);
    const E = D.exp;
    const e12 = E.filter(x => ym(x.at) >= m12);
    const py = D.pays.filter(y => !y.rev && ym(y.at) >= m12);
    const inc = sum(py, y => y.amt);
    const ex = sum(e12, x => x.amt);
    const net = inc - ex;
    const by = CATS.map(c => [c, sum(e12.filter(x => x.cat == c), x => x.amt)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    const pp = D.props.map(p => {
      const i = sum(py, y => {
        const c = g('charges', y.cid);
        const n = c && info(g('leases', c.lid));
        return n && n.p && n.p.id == p.id ? y.amt : 0;
      });
      return [p, i, sum(e12.filter(x => x.pid == p.id), x => x.amt)];
    });
    return `<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addExp">+ Expense</button></div><div class="grid"><div class="g k"><small>Income · 12 mo</small><b data-n="${inc}" data-p="₹">0</b></div><div class="g k"><small>Expenses · 12 mo</small><b data-n="${ex}" data-p="₹" style="color:var(--wr)">0</b></div><div class="g k"><small>Net</small><b style="color:${net >= 0 ? 'var(--ok)' : 'var(--er)'}">${inr(net)}</b></div></div>
${by.length ? '<h2>Where it goes</h2><div class="g k">' + by.map(([c, v]) => `<div style="margin:0 0 12px"><div style="display:flex;justify-content:space-between"><b style="font-size:14px;margin:0">${c}</b><span>${inr(v)}</span></div><div style="height:8px;border-radius:9px;background:var(--fl);margin-top:6px"><i style="display:block;height:100%;width:${v / by[0][1] * 100}%;border-radius:9px;background:linear-gradient(90deg,#ff9f0a,#ff6b35)"></i></div></div>`).join('') + '</div>' : ''}
<h2>Profit by property</h2>${pp.map(([p, i, x]) => `<div class="g row">${ico('props', '#30b0c7')}<div class="m"><b>${esc(p.name)}</b><small>Income ${inr(i)} · Expenses ${inr(x)}</small></div><b style="color:${i - x >= 0 ? 'var(--ok)' : 'var(--er)'}">${inr(i - x)}</b></div>`).join('') || empty('No properties')}
<h2>Recent expenses</h2><small style="color:var(--mu)">Tap one to delete it.</small><br><br>${E.slice(0, 30).map(x => {
      const p = g('props', x.pid);
      return `<div class="g row" data-a="delExp" data-i="${x.id}">${ico('exp', '#ff6b35')}<div class="m"><b>${x.cat} · ${inr(x.amt)}</b><small>${x.at} · ${p ? esc(p.name) : 'General'}${x.note ? ' · ' + esc(x.note) : ''}</small></div></div>`;
    }).join('') || empty('No expenses yet')}`;
  };
  A.addExp = () => sheet('New expense', [{
      k: 'p', l: 'Property', t: 'select', o: [['', 'General'], ...D.props.map(p => [p.id, p.name])]
    }, {
      k: 'c', l: 'Category', t: 'select', o: CATS.map(c => [c, c])
    }, {
      k: 'a', l: 'Amount (₹)', t: 'number', v: ''
    }, {
      k: 'd', l: 'Date', t: 'date', v: TD
    }, {
      k: 'n', l: 'Note', v: '', r: 0
    }], async (f) => {
    await ins('expenses', {
      property_id: f.p || null, category: f.c, amount: R(f.a), spent_on: f.d, note: f.n || ''
    });
    toast('Expense added');
  });
  A.delExp = e => {
    const id = e.dataset.i;
    sheet('Delete this expense?', [], async () => {
      await run(sb.from('expenses').delete().eq('id', id));
      toast('Deleted');
    }, 'Delete');
  };
  /* ---------- Home: cash-flow chart + quick actions ---------- */
  const cf = () => {
    const ms = [...Array(12)].map((_, i) => mk(i - 11));
    const inc = ms.map(m => sum(D.pays.filter(p => !p.rev && ym(p.at) == m), p => p.amt));
    const ex = ms.map(m => sum(D.exp.filter(x => ym(x.at) == m), x => x.amt));
    const mx = Math.max(1, ...inc, ...ex);
    const X = i => 10 + i * (320 / 11);
    const Y = v => 120 - v / mx * 100;
    const pa = a => a.map((v, i) => i ? `C${X(i - 1) + 14.5} ${Y(a[i - 1])} ${X(i) - 14.5} ${Y(v)} ${X(i)} ${Y(v)}` : `M${X(0)} ${Y(v)}`).join('');
    const an = CFA;
    CFA = 0;
    const n = inc[11] - ex[11];
    return `<div class="g" style="padding:14px 14px 8px"><div style="display:flex;justify-content:space-between;padding:0 4px"><small style="color:var(--mu);font-weight:600">Net this month</small><b style="color:${n >= 0 ? 'var(--ok)' : 'var(--er)'}">${inr(n)}</b></div><svg viewBox="0 0 340 140" width="100%"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a84ff" stop-opacity=".5"/><stop offset="1" stop-color="#0a84ff" stop-opacity="0"/></linearGradient></defs><path d="${pa(inc)}L${X(11)} 120L${X(0)} 120Z" style="fill:url(#cg);stroke:none"/><path d="${pa(inc)}" pathLength="1" class="${an ? 'dr' : ''}" style="stroke:var(--ac);stroke-width:2.5"/><path d="${pa(ex)}" pathLength="1" class="${an ? 'dr' : ''}" style="stroke:var(--wr);stroke-width:2"/>${ms.map((m, i) => i % 2 ? '' : `<text x="${X(i)}" y="136" text-anchor="middle" style="fill:var(--mu);stroke:none;font-size:9px">${ML(m)}</text>`).join('')}</svg><div style="display:flex;gap:14px;font-size:12px;color:var(--mu);padding:0 4px 6px"><span><b style="display:inline;color:var(--ac)">●</b> Collected</span><span><b style="display:inline;color:var(--wr)">●</b> Expenses</span></div></div>`;
  };
  const _h = V.home;
  V.home = () => {
    const h = _h();
    return mgr() ? h.replace('<h2>Billed vs collected</h2>', `<h2>Cash flow · 12 months</h2>${cf()}<div class="ch" style="margin-top:12px"><button class="pill g" data-a="remAll">Remind all overdue</button><button class="pill g" data-a="ics">Add dues to calendar</button><button class="pill g" data-a="addExp">+ Expense</button></div><h2>Billed vs collected</h2>`) : h;
  };
  A.remAll = () => {
    const od = D.charges.filter(c => st(c) == 'Overdue');
    if (!od.length)
      return toast('No overdue rent');
    modal(`<h3>Overdue reminders</h3><p style="color:var(--mu)">Tap a tenant to open WhatsApp or email with the message ready.</p>${od.map(c => {
      const i = info(g('leases', c.lid));
      const ph = (i.t.phone || '').replace(/\D/g, '');
      const m = `Hi ${i.t.name.split(' ')[0]}, a friendly reminder that rent of ${inr(bal(c))} for ${MF(c.m)} (${i.u.name}) was due on ${c.due}. Thank you, ${D.org}`;
      const u = ph ? 'https://wa.me/' + (ph.length == 10 ? '91' + ph : ph) + '?text=' + encodeURIComponent(m) : 'mailto:' + encodeURIComponent(i.t.email) + '?subject=' + encodeURIComponent('Rent reminder') + '&body=' + encodeURIComponent(m);
      return `<a class="g row" href="${esc(u)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${ico('pay', '#ff3b30')}<div class="m"><b>${esc(i.t.name)}</b><small>${inr(bal(c))} · ${esc(i.u.name)}</small></div><span class="bd Due">${ph ? 'WhatsApp' : 'Email'}</span></a>`;
    }).join('')}<button class="btn q" data-x style="width:100%">Close</button>`);
  };
  A.ics = () => {
    const d = s => s.replace(/-/g, '');
    const z = s => String(s).replace(/[,;]/g, '\\$&');
    const ev = [];
    const add = (s, t, n) => ev.push(`BEGIN:VEVENT\r\nUID:${Math.random().toString(36).slice(2)}@propertyos\r\nDTSTAMP:${d(TD)}T000000Z\r\nDTSTART;VALUE=DATE:${d(s)}\r\nSUMMARY:${z(t)}\r\nDESCRIPTION:${z(n)}\r\nEND:VEVENT`);
    CHS().filter(c => bal(c) > 0).forEach(c => {
      const i = info(g('leases', c.lid));
      add(c.due, `Rent due ${inr(bal(c))} · ${i.t.name} (${i.u.name})`, MF(c.m));
    });
    LS().filter(l => l.st == 'active').forEach(l => {
      const i = info(l);
      add(l.end, `Lease ends · ${i.t.name} (${i.u.name})`, 'Renew or plan handover');
    });
    if (!ev.length)
      return toast('Nothing to export');
    const a = document.createElement('a');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PropertyOS//EN\r\n' + ev.join('\r\n') + '\r\nEND:VCALENDAR');
    a.download = 'propertyos.ics';
    a.click();
    toast(ev.length + ' events exported');
  };
  /* ---------- Leases: renew + statement ---------- */
  const _L = V.leases;
  V.leases = () => _L().replace(/(<button class="btn s d"[^>]*data-a="endLease" data-i="([^"]+)">End<\/button>)/g, '$1 <button class="btn s q" style="margin-top:8px" data-a="renew" data-i="$2">Renew</button> <button class="btn s q" style="margin-top:8px" data-a="stmt" data-i="$2">Statement</button>');
  A.renew = e => {
    const l = g('leases', e.dataset.i);
    sheet('Renew lease', [{
        k: 'm', l: 'Months', t: 'number', v: 11, mn: 1, st: 1
      }, {
        k: 'r', l: 'New rent (₹), +5% suggested', t: 'number', v: Math.round(l.rent * 1.05)
      }], async (f) => {
      const s = new Date(l.end + 'T00:00:00Z');
      s.setUTCDate(s.getUTCDate() + 1);
      const y = s.getUTCFullYear();
      const m = s.getUTCMonth() + +f.m;
      const n = new Date(Date.UTC(y, m, Math.min(s.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate())));
      n.setUTCDate(n.getUTCDate() - 1);
      await upd('leases', l.id, { status: 'ended' });
      try {
        await ins('leases', {
          unit_id: l.uid, tenant_id: l.tid, starts_on: s.toISOString().slice(0, 10), ends_on: n.toISOString().slice(0, 10), rent: R(f.r), deposit: R(l.dep)
        });
      }
      catch (x) {
        await upd('leases', l.id, { status: 'active' });
        throw x;
      }
      toast('Lease renewed');
    }, 'Renew');
  };
  A.stmt = e => {
    const l = g('leases', e.dataset.i);
    const i = info(l);
    const cs = D.charges.filter(c => c.lid == l.id).sort((a, b) => a.m < b.m ? -1 : 1);
    const tb = sum(cs, c => c.amt);
    const tp = sum(cs, paid);
    const o = document.createElement('div');
    o.className = 'rcw';
    o.innerHTML = `<div class="rc r1"><div class="rh"><div class="rl"><div><b>${esc(D.org)}</b><small style="color:inherit">Tenant statement</small></div></div><div class="rn"><small style="color:inherit">As of</small><b>${TD}</b></div></div><div class="rg"><div><small>Tenant</small><b>${esc(i.t.name)}</b></div><div><small>Unit</small><b>${esc(i.p.name)} · ${esc(i.u.name)}</b></div><div><small>Billed</small><b>${inr(tb)}</b></div><div><small>Balance</small><b>${inr(tb - tp)}</b></div></div><table>${cs.map(c => `<tr><td>${MF(c.m)} · ${st(c)}</td><td>${inr(paid(c))} / ${inr(c.amt)}</td></tr>`).join('')}<tr><td>Total balance</td><td>${inr(tb - tp)}</td></tr></table><p class="rt">Computer-generated statement</p></div><div class="rcb g"><button class="btn s" data-p>Print / PDF</button><button class="btn s q" data-x>✕</button></div>`;
    o.onclick = ev => {
      const d = ev.target.dataset;
      if (d.p != null)
        print();
      else if (d.x != null || ev.target == o)
        o.remove();
    };
    document.body.append(o);
  };
  /* ---------- Settings entries ---------- */
  const _s = V.set;
  V.set = () => _s().replace('data-a="csv">Payments CSV</button>', 'data-a="csv">Payments CSV</button>' + (mgr() ? '<button class="btn q" data-a="ics">Calendar</button>' : '') + '<button class="btn q" data-a="glass">Glass lab</button>');
  window.GLASS = { G, ap };
  ap();
  if (document.body.classList.contains('ready'))
    render();
})();
