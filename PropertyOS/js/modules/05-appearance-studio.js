/* PropertyOS module 5: Appearance studio (auto theme, 10 palettes, accents, wallpapers, readability), UPI ID fix, instant-open snapshot,
   lightning-fast glass (no blur on cards, gradient blobs), and new visuals (insights, skyline, empty states). */
(() => {
  const safe = f => {
    try {
      return f();
    }
    catch (e) {
      return null;
    }
  };
  const mu = 'style="color:var(--mu)"';
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const html = document.documentElement;
  const mqD = matchMedia('(prefers-color-scheme:dark)');
  const lite = html.classList.contains('lite');
  /* ================= Appearance state ================= */
  const PAL = {
    reference: ['Jade & Dusk', ['#d8eee3', '#8fd6b8', '#e4e7a6', '#7db6cf'], ['#0d0a2a', '#4a30c0', '#e0642a', '#c0508a']],
    aurora: ['Aurora', ['#d6e6ff', '#7cb8ff', '#d9a8ff', '#ffc6a1'], ['#080c24', '#1d4fd8', '#7a2bd6', '#d4522a']],
    ocean: ['Ocean', ['#d3f0f7', '#5ec8e5', '#7aa7ff', '#9ef0d0'], ['#04141f', '#0a6c8f', '#1b4fd0', '#0b8f77']],
    sunset: ['Sunset', ['#ffe3d1', '#ff9f7a', '#ff7aa8', '#ffd27a'], ['#1c0c14', '#c43d2b', '#a82a6e', '#c98a14']],
    forest: ['Forest', ['#dff3e0', '#7ad69a', '#a8e06a', '#6fd0c0'], ['#07140d', '#14753f', '#4a8a14', '#0c7a6a']],
    rose: ['Rose', ['#ffe0ec', '#ff8fb4', '#d9a0ff', '#ffc0a0'], ['#1c0a14', '#b02560', '#7a2bd6', '#c4502a']],
    lavender: ['Lavender', ['#ece4ff', '#b49cff', '#8fb8ff', '#f0a8ff'], ['#0e0a22', '#5a35c9', '#2a4fd0', '#a02bb8']],
    gold: ['Gold', ['#fff3d6', '#ffd36a', '#ffb27a', '#f0e08a'], ['#17110a', '#a8750a', '#b0501a', '#8a8a14']],
    mint: ['Mint', ['#dcf8f1', '#6fe0c4', '#8fd0ff', '#c5f08a'], ['#06161a', '#0a8f78', '#1a6ab8', '#6a9a14']],
    slate: ['Slate', ['#e8ecf2', '#b6c2d4', '#cfd6e3', '#dfe4ee'], ['#0b0e14', '#2a3550', '#1e2a40', '#353a4a']],
    ember: ['Ember', ['#ffe6dc', '#ff7a59', '#ffb15a', '#ff8aa0'], ['#190905', '#b8300f', '#b0620f', '#a02a40']]
  };
  const ACC = [['#0a6cff', 'Blue'], ['#4f46e5', 'Indigo'], ['#9333ea', 'Purple'], ['#db2777', 'Pink'], ['#dc2626', 'Red'], ['#d9580a', 'Orange'], ['#b7791f', 'Amber'], ['#15803d', 'Green'], ['#0f766e', 'Teal'], ['#0e7490', 'Cyan'], ['#475569', 'Slate']];
  const WP = [['', 'None'], ['sky', 'Skyline'], ['wave', 'Waves'], ['dots', 'Dots'], ['topo', 'Contours'], ['grid', 'Grid']];
  let L = Object.assign({
    th: '', pal: 'reference', ac: '#0a6cff', wp: '', wpb: 6, wpd: 18, op: 62, glass: 'fast', live: lite ? 0 : 1, hc: 0
  }, safe(() => JSON.parse(ls('po-look') || '{}')) || {});
  if (!ls('po-ref1')) { L.pal = 'reference'; ls('po-ref1', '1'); ls('po-look', JSON.stringify(L)); }
  const saveL = () => ls('po-look', JSON.stringify(L));
  const isDark = () => L.th == 'dark' || L.th == 'amoled' || (!L.th && mqD.matches);
  const lum = h => {
    const n = parseInt(h.slice(1), 16);
    const f = v => {
      v /= 255;
      return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    };
    return .2126 * f(n >> 16) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255);
  };
  const on = h => lum(h) > .42 ? '#0b1226' : '#fff';
  /* ---------- visuals: skyline + wallpapers ---------- */
  function skyline(w, h, c, seed, lit) {
    let s = seed;
    let r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    let o = '';
    let x = 0;
    while (x < w) {
      const bw = 18 + r() * 40;
      const bh = h * (.25 + r() * .6);
      o += `<rect x="${x | 0}" y="${(h - bh) | 0}" width="${bw | 0}" height="${bh | 0}" fill="${c}"/>`;
      if (lit)
        for (let wy = h - bh + 8; wy < h - 8; wy += 12)
          for (let wx = x + 5; wx < x + bw - 6; wx += 9)
            if (r() > .74)
              o += `<rect${r() > .82 ? ' class="tw"' : ''} x="${wx | 0}" y="${wy | 0}" width="4" height="5" fill="${lit}"/>`;
      x += bw + 2 + r() * 4;
    }
    return o;
  }
  const wv = (y, a, f, ph, c, op) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 1600; x += 40)
      d += `L${x} ${(y + Math.sin(x / 1600 * Math.PI * f + ph) * a).toFixed(1)}`;
    return `<path d="${d}L1600 1000L0 1000Z" fill="${c}" fill-opacity="${op}"/>`;
  };
  function art(id, dark, P) {
    const [bg, c1, c2, c3] = P;
    const def = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? bg : c2}"/><stop offset="1" stop-color="${dark ? c2 : c3}" stop-opacity="${dark ? .55 : .9}"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/>`;
    let b = '';
    if (id == 'sky')
      b = `<circle cx="1180" cy="300" r="120" fill="${c1}" fill-opacity=".55"/><g transform="translate(0 560)" opacity=".5">${skyline(1600, 300, dark ? '#000' : '#5b6fa8', 11)}</g><g transform="translate(0 640)" opacity=".8">${skyline(1600, 360, dark ? '#05070f' : '#2c3a6a', 5, dark ? '#ffd27a' : '#fff4c2')}</g>`;
    else if (id == 'wave')
      b = wv(560, 60, 4, 0, c1, .5) + wv(660, 70, 3, 1.5, c2, .5) + wv(780, 50, 5, 3, c3, .6) + wv(880, 40, 3, 5, dark ? '#000' : '#fff', .25);
    else if (id == 'dots')
      b = `<pattern id="p" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="22" cy="22" r="2.6" fill="${dark ? '#fff' : c1}" fill-opacity=".35"/></pattern><circle cx="1100" cy="260" r="360" fill="${c1}" fill-opacity=".35"/><rect width="1600" height="1000" fill="url(#p)"/>`;
    else if (id == 'topo') {
      for (let i = 1; i <= 16; i++)
        b += `<ellipse cx="800" cy="520" rx="${i * 68}" ry="${i * 40}" fill="none" stroke="${i % 3 ? c1 : c3}" stroke-opacity=".4" stroke-width="2" transform="rotate(${i * 3} 800 520)"/>`;
    }
    else if (id == 'grid') {
      for (let i = 0; i <= 1600; i += 64)
        b += `<path d="M${i} 0V1000" stroke="${dark ? '#fff' : c1}" stroke-opacity=".14"/>`;
      for (let i = 0; i <= 1000; i += 64)
        b += `<path d="M0 ${i}H1600" stroke="${dark ? '#fff' : c1}" stroke-opacity=".14"/>`;
      b += `<circle cx="400" cy="700" r="320" fill="${c3}" fill-opacity=".3"/><circle cx="1200" cy="260" r="260" fill="${c1}" fill-opacity=".3"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${def}${b}</svg>`;
  }
  const uri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  /* ---------- apply ---------- */
  const wpl = document.createElement('div');
  wpl.id = 'wpl';
  document.body.prepend(wpl);
  const st5 = document.createElement('style');
  st5.id = 'po-look';
  document.head.append(st5);
  const meta = [...document.querySelectorAll('meta[name=theme-color]')];
  function apply() {
    const P = PAL[L.pal] || PAL.aurora;
    const am = L.th == 'amoled';
    const dk = isDark();
    const op = L.op / 100;
    const ac = L.ac || '#0a6cff';
    const hc = L.hc;
    const wp = L.wp;
    const hasWp = !!wp && (wp != 'img' || ls('po-wpimg'));
    if (L.th == 'light' || L.th == '')
      L.th == 'light' ? html.dataset.theme = 'light' : delete html.dataset.theme;
    else
      html.dataset.theme = 'dark';
    const lv = `--bg:${P[1][0]};--c1:${P[1][1]};--c2:${P[1][2]};--c3:${P[1][3]};--tx:#0b1226;--mu:rgba(11,18,38,${hc ? .94 : .74});--gl:rgba(255,255,255,${op});--gb:rgba(255,255,255,${hc ? 1 : .85});--fl:rgba(255,255,255,.62);--sh:rgba(40,60,130,.2);--ab:${ac};--ac:${ac};--on:${on(ac)};--dimc:rgba(255,255,255,${(L.wpd / 100 * .85).toFixed(2)});--ok:#128a3a;--wr:#b86500;--er:#d3271c`;
    const dv = `--bg:${am ? '#000' : P[2][0]};--c1:${am ? '#0a1a44' : P[2][1]};--c2:${am ? '#1a0b3a' : P[2][2]};--c3:${am ? '#2a0f10' : P[2][3]};--tx:#f4f6ff;--mu:rgba(244,246,255,${hc ? .96 : .8});--gl:rgba(${am ? '14,16,28' : '24,30,64'},${op});--gb:rgba(255,255,255,${hc ? .6 : .26});--fl:rgba(255,255,255,.1);--sh:rgba(0,0,0,.5);--ab:${ac};--ac:color-mix(in srgb,${ac} 60%,#fff);--on:${on(ac)};--dimc:rgba(0,0,0,${(L.wpd / 100).toFixed(2)});--ok:#32d74b;--wr:#ff9f0a;--er:#ff6961`;
    let css = `:root{${lv}}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){${dv}}}:root[data-theme="dark"]{${dv}}
.btn:not(.q):not(.d){background:linear-gradient(180deg,color-mix(in srgb,var(--ab) 82%,#fff),var(--ab));color:var(--on,#fff);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 6px 16px color-mix(in srgb,var(--ab) 38%,transparent)}
a,.ax a{color:var(--ac)}
.bl i{filter:none!important;will-change:transform;opacity:.85!important;background:radial-gradient(closest-side,var(--c1),transparent)!important}.bl i:nth-child(2){background:radial-gradient(closest-side,var(--c2),transparent)!important}.bl i:nth-child(3){background:radial-gradient(closest-side,var(--c3),transparent)!important}
${L.live && !lite ? '' : '.bl i{animation:none!important}'}
body::after{display:none!important}
#wpl{position:fixed;inset:-26px;z-index:-1;background-size:cover;background-position:center;filter:blur(${L.wpb}px);display:${hasWp ? 'block' : 'none'};transform:translateZ(0)}#wpl::after{content:'';position:absolute;inset:0;background:var(--dimc)}
${hasWp ? '.bl{display:none}' : ''}
`;
    if (hasWp)
      css += `#wpl{background-image:${wp == 'img' ? `url("${ls('po-wpimg')}")` : uri(art(wp, dk, P[dk ? 2 : 1]))}}`;
    css += L.glass == 'rich' ? `.g{backdrop-filter:blur(16px) saturate(1.6);-webkit-backdrop-filter:blur(16px) saturate(1.6)}` : `.g{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:inset 0 0 0 1px var(--gb),0 4px 14px var(--sh)!important}nav.tb,.sh,.gc,header.sc{backdrop-filter:blur(18px) saturate(1.5)!important;-webkit-backdrop-filter:blur(18px) saturate(1.5)!important}.ov{backdrop-filter:none!important;background:rgba(5,10,30,.5)!important}`;
    css += `.row,.k,.fc4,.cl{contain:layout style}.lgx *{backdrop-filter:none}`;
    st5.textContent = css;
    html.classList.toggle('hc', !!hc);
    meta.forEach(m => m.content = dk ? (am ? '#000' : P[2][0]) : P[1][0]);
    const G = safe(() => GLASS.G);
    if (G) {
      G.th = L.th == 'amoled' ? 'dark' : L.th;
    }
  }
  mqD.addEventListener && mqD.addEventListener('change', () => apply());
  /* one-time reset to the new defaults: auto theme, no SVG refraction, cheap glass */
  if (!ls('po-v5')) {
    ls('po-v5', '1');
    ls('po-theme', '');
    L.th = '';
    saveL();
    const G = safe(() => GLASS.G);
    if (G) {
      G.on = 0;
      G.th = '';
      G.ac = '';
      safe(() => GLASS.ap());
    }
    delete html.dataset.theme;
    html.style.removeProperty('--ac');
  }
  apply();
  A.theme = () => {
    const o = ['', 'light', 'dark', 'amoled'];
    L.th = o[(o.indexOf(L.th) + 1) % 4];
    ls('po-theme', L.th == 'amoled' ? 'dark' : L.th);
    saveL();
    apply();
    toast('Theme: ' + (L.th || 'auto'));
  };
  /* ================= Appearance studio ================= */
  let LM = null;
  const tile = (k, v, cur, inner, st = '') => `<button class="lt ${cur == v ? 'on' : ''}" data-lk="${k}" data-v="${v}" style="${st}">${inner}</button>`;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, n]) => `<button data-lk="${k}" data-v="${v}" class="${String(L[k]) == String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  function lookHTML() {
    const dk = isDark();
    return `<h3>Appearance</h3><small class="lh">Theme</small>${seg('th', [['', 'Auto'], ['light', 'Light'], ['dark', 'Dark'], ['amoled', 'AMOLED']])}
<small class="lh">Colour palette</small><div class="lg">${Object.keys(PAL).map(k => {
      const p = PAL[k][dk ? 2 : 1];
      return tile('pal', k, L.pal, `<span>${PAL[k][0]}</span>`, `background:linear-gradient(135deg,${p[1]},${p[2]} 55%,${p[3]})`);
    }).join('')}</div>
<small class="lh">Accent colour</small><div class="sw2">${ACC.map(([v, n]) => `<button aria-label="${n}" data-lk="ac" data-v="${v}" class="${L.ac == v ? 'on' : ''}" style="background:${v}"></button>`).join('')}<label class="cc" title="Custom"><input type="color" data-lk-in="ac" value="${/^#[0-9a-f]{6}$/i.test(L.ac) ? L.ac : '#0a6cff'}"></label></div>
<small class="lh">Wallpaper</small><div class="lg w">${WP.map(([v, n]) => tile('wp', v, L.wp, `<span>${n}</span>`, v ? `background-image:${uri(art(v, dk, PAL[L.pal][dk ? 2 : 1]))};background-size:cover` : 'background:var(--fl)')).join('')}${tile('wp', 'img', L.wp, '<span>My photo</span>', ls('po-wpimg') ? `background-image:url("${ls('po-wpimg')}");background-size:cover` : 'background:var(--fl)')}</div><input type="file" id="lkf" accept="image/*" hidden>
${L.wp ? `<label class="rg">Wallpaper blur <b>${L.wpb}px</b><input class="rng" type="range" min="0" max="24" value="${L.wpb}" data-lk-in="wpb" style="--p:${(L.wpb/24)*100}%"></label><label class="rg">Wallpaper dim <b>${L.wpd}%</b><input class="rng" type="range" min="0" max="70" value="${L.wpd}" data-lk-in="wpd" style="--p:${(L.wpd/70)*100}%"></label>` : ''}
<label class="rg">Card opacity <small ${mu}>(raise for easier reading)</small> <b>${L.op}%</b><input class="rng" type="range" min="35" max="96" value="${L.op}" data-lk-in="op" style="--p:${((L.op-35)/61)*100}%"></label>
<small class="lh">Glass</small>${seg('glass', [['fast', 'Fast'], ['rich', 'Rich blur']])}<small class="lh">Motion</small>${seg('live', [[1, 'Live background'], [0, 'Still']])}<small class="lh">Contrast</small>${seg('hc', [[0, 'Normal'], [1, 'High']])}
<div class="ac" style="margin-top:14px"><button class="btn q" data-lk="reset">Reset</button><button class="btn" data-x>Done</button></div>`;
  }
  const paint = () => {
    if (!LM || !document.contains(LM))
      return;
    const s = LM.querySelector('.sh');
    const t = s.scrollTop;
    s.innerHTML = lookHTML();
    s.scrollTop = t;
  };
  A.look = () => {
    modal(lookHTML());
    LM = [...document.querySelectorAll('.ov')].pop();
    const s = LM.querySelector('.sh');
    s.style.cssText += 'max-height:88vh;overflow:auto;overscroll-behavior:contain';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lk]');
    if (!b)
      return;
    const k = b.dataset.lk;
    const v = b.dataset.v;
    if (k == 'reset') {
      L = Object.assign({}, {
        th: '', pal: 'aurora', ac: '#0a6cff', wp: '', wpb: 6, wpd: 18, op: 62, glass: 'fast', live: lite ? 0 : 1, hc: 0
      });
      ls('po-wpimg', '');
    }
    else if (k == 'wp' && v == 'img') {
      if (!ls('po-wpimg')) {
        const f = $('#lkf');
        f && f.click();
        return;
      }
      L.wp = 'img';
    }
    else {
      L[k] = ['live', 'hc'].includes(k) ? +v : v;
    }
    if (k == 'th')
      ls('po-theme', L.th == 'amoled' ? 'dark' : L.th);
    saveL();
    apply();
    paint();
  });
  document.addEventListener('input', e => {
    const r = e.target.closest('[data-lk-in]');
    if (!r)
      return;
    const k = r.dataset.lkIn;
    L[k] = k == 'ac' ? r.value : +r.value;
    if (r.type == 'range') {
      const b = r.parentNode.querySelector('b');
      if (b)
        b.textContent = r.value + (k == 'op' || k == 'wpd' ? '%' : 'px');
    }
    clearTimeout(apply.t);
    apply.t = setTimeout(() => {
      saveL();
      apply();
    }, 60);
  });
  document.addEventListener('change', e => {
    if (e.target.id != 'lkf' || !e.target.files[0])
      return;
    const f = e.target.files[0];
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const m = 1440;
        const sc = Math.min(1, m / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = im.width * sc;
        c.height = im.height * sc;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        try {
          ls('po-wpimg', c.toDataURL('image/jpeg', .8));
          if (ls('po-wpimg')) {
            L.wp = 'img';
            saveL();
            apply();
            paint();
            toast('Wallpaper set');
          }
          else
            toast('Image too large for this device');
        }
        catch (x) {
          toast('Could not use this image');
        }
      };
      im.onerror = () => toast('Not a valid image');
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
  const _set = V.set;
  V.set = () => _set().replace('data-a="glass">Glass lab</button>', 'data-a="look">Appearance</button><button class="btn q" data-a="glass">Glass lab</button>');
  /* ================= UPI ID: accepts every real-world handle ================= */
  const RE = /^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9._-]{1,63}$/i;
  const HAND = ['ybl', 'paytm', 'oksbi', 'okaxis', 'okhdfcbank', 'okicici', 'ibl', 'axl', 'upi', 'sbi', 'apl', 'airtel'];
  const PSP = {
    ybl: 'PhonePe', ibl: 'PhonePe', axl: 'PhonePe', paytm: 'Paytm', ptyes: 'Paytm', ptsbi: 'Paytm', pthdfc: 'Paytm', ptaxis: 'Paytm', okhdfcbank: 'Google Pay', okicici: 'Google Pay', oksbi: 'Google Pay', okaxis: 'Google Pay', apl: 'Amazon Pay', yapl: 'Amazon Pay', upi: 'BHIM', sbi: 'State Bank of India', hdfcbank: 'HDFC Bank', icici: 'ICICI Bank', axisbank: 'Axis Bank', kotak: 'Kotak', ikwik: 'MobiKwik', freecharge: 'Freecharge', jio: 'JioPay', airtel: 'Airtel Payments Bank', postbank: 'India Post Payments Bank', indus: 'IndusInd', idfcbank: 'IDFC First', federal: 'Federal Bank', yesbank: 'YES Bank', pnb: 'PNB', boi: 'Bank of India', cnrb: 'Canara Bank', unionbank: 'Union Bank', rbl: 'RBL Bank'
  };
  const norm = v => {
    v = String(v || '').trim();
    const m = v.match(/[?&]pa=([^&]+)/i);
    if (m)
      v = safe(() => decodeURIComponent(m[1])) || m[1];
    return v.replace(/\s+/g, '').toLowerCase();
  };
  const hint = v => {
    if (!v)
      return ['', 'Type your UPI ID, or tap a handle below'];
    if (!v.includes('@'))
      return ['', 'Add the bank handle, e.g. @ybl or @paytm'];
    if (RE.test(v)) {
      const h = v.split('@')[1];
      return ['ok', '✓ Looks good' + (PSP[h] ? ' · ' + PSP[h] : '')];
    }
    return ['er', 'Use letters, numbers, dot, dash or underscore, then @ and the handle'];
  };
  A.upi = () => {
    const cur = D.upi || ls('po-upi-' + ORG) || '';
    modal(`<div class="iq"><h3>UPI ID for rent QR</h3><p ${mu} style="margin:0 0 12px">Tenants pay this ID. Works with any UPI app: name@ybl, 9876543210@paytm, name@oksbi and more.</p><label>UPI ID<input id="uv" value="${esc(cur)}" placeholder="name@ybl" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email" autocomplete="off"></label><p id="uh" style="margin:-4px 0 8px;font-size:13px;min-height:18px"></p><div class="hc4">${HAND.map(h => `<button type="button" data-uh="${h}">@${h}</button>`).join('')}</div><p id="um" style="color:var(--er);min-height:18px;margin:6px 0;font-size:14px"></p><div class="ac"><button class="btn q" data-x>Cancel</button><button class="btn" id="us">Save</button></div></div>`);
    const i = $('#uv');
    const h = $('#uh');
    const m = $('#um');
    const sv = $('#us');
    const up = () => {
      const [c, t] = hint(norm(i.value));
      h.textContent = t;
      h.style.color = c == 'ok' ? 'var(--ok)' : c == 'er' ? 'var(--er)' : 'var(--mu)';
    };
    i.oninput = up;
    up();
    document.querySelector('.hc4').onclick = e => {
      const b = e.target.closest('[data-uh]');
      if (!b)
        return;
      const v = norm(i.value).split('@')[0];
      i.value = (v || '') + '@' + b.dataset.uh;
      up();
      i.focus();
    };
    sv.onclick = async () => {
      const v = norm(i.value);
      m.textContent = '';
      if (!RE.test(v))
        return m.textContent = 'Enter a valid UPI ID, like name@ybl or 9876543210@paytm';
      /* 1) save on this device immediately so QR codes work right away */
      ls('po-upi-' + ORG, v);
      D.upi = v;
      sv.disabled = true;
      sv.textContent = 'Syncing…';
      /* 2) sync to your workspace so tenants on other devices see it */
      let r;
      try {
        r = await sb.rpc('set_upi_id', { p_org: ORG, p_upi: v });
      }
      catch (x) {
        r = { error: { message: String(x && x.message || x) } };
      }
      const er = r && r.error;
      render();
      if (!er) {
        sv.closest('.ov').remove();
        return toast('UPI ID saved ✓');
      }
      const raw = (er.message || '') + (er.code ? ' (' + er.code + ')' : '');
      const perm = /Only the workspace owner|Permission denied/i.test(raw);
      const nofn = /function|PGRST202/i.test(raw);
      const chk = /23514|check constraint|upi_id_check/i.test(raw);
      const why = perm ? 'Only the workspace owner account can publish the UPI ID to tenants. Sign in as the owner, then save again.' : nofn ? 'Your database is missing the UPI setup. Run migration 006, then 009, in the Supabase SQL editor.' : chk ? 'Your database rejected this format. Run migration 009 in the Supabase SQL editor, then save again.' : 'Could not reach the server. Check your connection and save again.';
      m.style.color = 'var(--tx)';
      m.innerHTML = `<b style="color:var(--ok)">✓ Saved on this device. QR codes work here.</b><br><span style="color:var(--er)">Not synced to tenants: ${esc(why)}</span><br><small ${mu}>Details: ${esc(raw || 'unknown')}</small>`;
      sv.disabled = false;
      sv.textContent = 'Try again';
    };
  };
  /* silently re-sync a locally saved UPI ID the next time the owner opens the app */
  const _ld0 = load;
  load = async function () {
    const r = await _ld0.apply(this, arguments);
    setTimeout(() => {
      const v = safe(() => ls('po-upi-' + ORG));
      if (v && mgr() && D.owner && RE.test(v) && !D.upi)
        sb.rpc('set_upi_id', { p_org: ORG, p_upi: v }).then(x => {
          if (x && !x.error)
            D.upi = v;
        }).catch(() => {
        });
    }, 1500);
    return r;
  };
  /* ================= Speed: instant-open snapshot, stale reload ================= */
  const snap = () => safe(() => {
    if (!S || !ORG)
      return;
    const j = JSON.stringify({
      u: S.user.id, o: ORG, r: role, D
    });
    if (j.length < 1.6e6)
      localStorage.setItem('po-snap', j);
  });
  const _ld = load;
  load = async function () {
    const r = await _ld.apply(this, arguments);
    setTimeout(snap, 400);
    return r;
  };
  function hydrate() {
    const j = safe(() => JSON.parse(localStorage.getItem('po-snap') || 'null'));
    if (!j || !S || j.u !== S.user.id)
      return 0;
    Object.assign(D, j.D);
    ORG = j.o;
    role = j.r;
    view = 'home';
    fresh = true;
    window._hyd = 1;
    gate('');
    document.body.classList.add('ready');
    safe(render);
    return 1;
  }
  const _s = start;
  let tried = 0;
  start = function () {
    if (!S) {
      safe(() => localStorage.removeItem('po-snap'));
      window._hyd = 0;
    }
    else if (!tried) {
      tried = 1;
      hydrate();
    }
    return _s.apply(this, arguments);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window._stale && ORG) {
      window._stale = 0;
      load().then(render).catch(() => {
      });
    }
  });
  /* ================= Visuals: insights, empty states, landing skyline ================= */
  const css2 = document.createElement('style');
  css2.textContent = `
html {
  -webkit-tap-highlight-color: transparent;
}

header.sc .btn,
header .btn.q,
.pill {
  white-space: nowrap;
}

header.sc .btn.s,
header .btn.q.s {
  padding: 9px 14px;
}

button,
a,
.row,
.pill {
  touch-action: manipulation;
}

.sh,
.ov {
  overscroll-behavior: contain;
}

.hc .g {
  border-width: 2px;
}

.hc .btn.q,
.hc .pill {
  box-shadow: inset 0 0 0 2px var(--tx);
}

.lh {
  display: block;
  margin: 12px 0 6px;
  color: var(--mu);
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.lg {
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(88px,1fr));
  gap: 8px;
}

.lt {
  position: relative;
  height: 56px;
  border: 0;
  border-radius: 16px;
  cursor: pointer;
  color: #fff;
  font: 700 12px inherit;
  font-family: inherit;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.4), 0 3px 10px var(--sh);
  display: flex;
  align-items: flex-end;
  padding: 6px 8px;
  text-shadow: 0 1px 3px rgba(0,0,0,.55);
}

.lt.on {
  outline: 3px solid var(--tx);
  outline-offset: 2px;
}

.lg.w .lt {
  height: 62px;
}

.sw2 .cc {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--gb);
  background: conic-gradient(red,yellow,lime,cyan,blue,magenta,red);
  cursor: pointer;
  display: block;
  margin: 0;
}

.sw2 .cc input {
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  cursor: pointer;
}

.rg {
  display: block;
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
}

.rg b {
  float: right;
}

.rg input[type="range"] {
  /* liquid style from refinements.css */
  padding: 0;
  background: none;
  border: 0;
}

.hc4 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hc4 button {
  border: 0;
  border-radius: 99px;
  padding: 7px 12px;
  font: 600 13px inherit;
  font-family: inherit;
  color: var(--tx);
  background: var(--fl);
  box-shadow: inset 0 0 0 1px var(--gb);
  cursor: pointer;
}

.ins {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
  gap: 12px;
  margin: 0 0 14px;
}

.ins .g {
  padding: 16px;
  border-radius: 26px;
}

.ins h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.bn {
  grid-column: 1/-1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 84px;
}

.bn svg.sky {
  position: absolute;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 60%;
  color: var(--ab);
  opacity: .28;
  pointer-events: none;
}

.bn>div {
  position: relative;
}

.tw {
  animation: tw 3s ease-in-out infinite;
}

.tw:nth-child(odd) {
  animation-delay: -1.4s;
}

@keyframes tw {
  50% {
  opacity: .15;
  }
}

.ins svg,
svg.dn,
svg.sky,
svg.sp4 {
  stroke: none;
}

.sp4 path.l {
  stroke: var(--ab);
}

.dn text {
  stroke: none;
}

.dnw {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dn circle {
  animation: dnr 1s cubic-bezier(.2,.9,.3,1) both;
}

@keyframes dnr {
  from {
  stroke-dasharray: 0 999;
  }
}

.dn text {
  fill: var(--tx);
  font: 800 22px system-ui, sans-serif;
}

.dn .s {
  fill: var(--mu);
  font: 600 9px system-ui, sans-serif;
}

.lg4 {
  font-size: 13px;
  line-height: 1.9;
}

.lg4 i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 7px;
}

.lg4 b {
  float: right;
  margin-left: 12px;
}

.sp4 path.a {
  fill: url(#spg);
}

.sp4 path.l {
  fill: none;
  stroke: var(--ab);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sp4 circle {
  fill: var(--ab);
}

.ob {
  margin: 7px 0;
  font-size: 13px;
  font-weight: 600;
}

.ob div {
  height: 8px;
  border-radius: 9px;
  background: var(--fl);
  margin-top: 4px;
  overflow: hidden;
}

.ob i {
  display: block;
  height: 100%;
  border-radius: 9px;
  transition: width .8s cubic-bezier(.2,.9,.3,1);
}

.em::before {
  content: '';
  display: block;
  height: 92px;
  margin: 0 auto 10px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 92'%3E%3Cellipse cx='60' cy='84' rx='46' ry='6' fill='%23000' fill-opacity='.12'/%3E%3Crect x='30' y='26' width='44' height='58' rx='6' fill='%237aa7ff'/%3E%3Crect x='56' y='10' width='38' height='74' rx='6' fill='%23af52de'/%3E%3Cg fill='%23fff' fill-opacity='.85'%3E%3Crect x='37' y='34' width='8' height='8' rx='2'/%3E%3Crect x='53' y='34' width='8' height='8' rx='2'/%3E%3Crect x='37' y='50' width='8' height='8' rx='2'/%3E%3Crect x='63' y='20' width='8' height='8' rx='2'/%3E%3Crect x='79' y='20' width='8' height='8' rx='2'/%3E%3Crect x='63' y='36' width='8' height='8' rx='2'/%3E%3Crect x='79' y='36' width='8' height='8' rx='2'/%3E%3Crect x='79' y='52' width='8' height='8' rx='2'/%3E%3C/g%3E%3Crect x='44' y='64' width='12' height='20' rx='3' fill='%23fff' fill-opacity='.9'/%3E%3C/svg%3E") center/contain no-repeat;
}

#gate.lp::after {
  content: '';
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 150px;
  pointer-events: none;
  opacity: .55;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='150' viewBox='0 0 600 150'%3E%3Cg fill='%237aa7ff' fill-opacity='.35'%3E%3Crect x='10' y='70' width='40' height='80'/%3E%3Crect x='60' y='40' width='34' height='110'/%3E%3Crect x='104' y='85' width='50' height='65'/%3E%3Crect x='164' y='25' width='38' height='125'/%3E%3Crect x='212' y='60' width='46' height='90'/%3E%3Crect x='268' y='90' width='36' height='60'/%3E%3Crect x='314' y='35' width='44' height='115'/%3E%3Crect x='368' y='75' width='38' height='75'/%3E%3Crect x='416' y='20' width='34' height='130'/%3E%3Crect x='460' y='65' width='50' height='85'/%3E%3Crect x='520' y='45' width='40' height='105'/%3E%3Crect x='566' y='88' width='34' height='62'/%3E%3C/g%3E%3C/svg%3E") bottom/600px 150px repeat-x;
}
`;
  document.head.append(css2);
  const COLS = ['#7aa7ff', '#af52de', '#ff2d78', '#ff9f0a', '#30d158', '#64d2ff', '#ffd60a'];
  const cmp = n => '₹' + (n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n));
  function ring(parts, center, sub) {
    const z = 120;
    const w = 15;
    const r = (z - w) / 2;
    const c = 2 * Math.PI * r;
    const t = sum(parts, p => p[1]) || 1;
    let o = 0;
    return `<svg class="dn" viewBox="0 0 ${z} ${z}" width="112" height="112"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--fl)" stroke-width="${w}"/>${parts.filter(p => p[1] > 0).map(p => {
      const l = p[1] / t * c;
      const s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${p[2]}" stroke-width="${w}" stroke-dasharray="${l.toFixed(1)} ${(c - l).toFixed(1)}" stroke-dashoffset="${(-o).toFixed(1)}" transform="rotate(-90 60 60)"/>`;
      o += l;
      return s;
    }).join('')}<text x="60" y="${sub ? 60 : 66}" text-anchor="middle">${center}</text>${sub ? `<text class="s" x="60" y="75" text-anchor="middle">${sub}</text>` : ''}</svg>`;
  }
  function insights() {
    const cs = D.charges.filter(c => c.m == CM);
    const col = sum(cs, paid);
    const od = sum(cs.filter(c => st(c) == 'Overdue'), bal);
    const pe = sum(cs.filter(c => st(c) == 'Due' || st(c) == 'Partial'), bal);
    const tot = col + od + pe;
    const pct = tot ? Math.round(col / tot * 100) : 0;
    const occ = D.units.filter(active).length;
    const roll = sum(D.leases.filter(l => l.st == 'active'), l => l.rent);
    let o = `<div class="ins"><div class="g bn"><div><b style="font-size:17px">${D.props.length} ${D.props.length == 1 ? 'property' : 'properties'} · ${D.units.length} units</b><br><span ${mu}>${occ} let · ${inr(roll)} monthly rent roll</span></div><svg class="sky" viewBox="0 0 400 100" preserveAspectRatio="xMaxYMax slice">${skyline(400, 100, 'currentColor', 7, '#ffd27a')}</svg></div>`;
    o += `<div class="g"><h3>Rent status · ${ML(CM)}</h3>${tot ? `<div class="dnw">${ring([['Collected', col, 'var(--ok)'], ['Pending', pe, 'var(--ab)'], ['Overdue', od, 'var(--er)']], pct + '%', 'COLLECTED')}<div class="lg4"><div><i style="background:var(--ok)"></i>Collected<b>${inr(col)}</b></div><div><i style="background:var(--ab)"></i>Pending<b>${inr(pe)}</b></div><div><i style="background:var(--er)"></i>Overdue<b>${inr(od)}</b></div></div></div>` : `<span ${mu}>Generate this month’s rent to see the split.</span>`}</div>`;
    const vals = [-5, -4, -3, -2, -1, 0].map(k => sum(D.charges.filter(c => c.m == mk(k)), paid));
    const mx = Math.max(1, ...vals);
    const W = 260;
    const H = 70;
    const pts = vals.map((v, i) => [10 + i * (W - 20) / 5, H - 8 - (v / mx) * (H - 20)]);
    const ln = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    o += `<div class="g"><h3>Collected · 6 months</h3><svg class="sp4" viewBox="0 0 ${W} ${H}" width="100%" height="84"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ab)" stop-opacity=".4"/><stop offset="1" stop-color="var(--ab)" stop-opacity="0"/></linearGradient></defs><path class="a" d="${ln}L${pts[5][0]} ${H}L${pts[0][0]} ${H}Z"/><path class="l" d="${ln}"/><circle cx="${pts[5][0]}" cy="${pts[5][1]}" r="4"/></svg><div style="display:flex;justify-content:space-between;font-size:12px" ${mu}><span>${ML(mk(-5))}</span><b style="color:var(--tx)">${inr(vals[5])}</b><span>${ML(CM)}</span></div></div>`;
    if (D.props.length)
      o += `<div class="g"><h3>Occupancy by property</h3>${D.props.slice(0, 5).map(p => {
        const us = D.units.filter(u => u.pid == p.id);
        const oc = us.filter(active).length;
        const pc = us.length ? Math.round(oc / us.length * 100) : 0;
        return `<div class="ob"><span>${esc(p.name)}</span><span style="float:right" ${mu}>${oc}/${us.length}</span><div><i style="width:${pc}%;background:linear-gradient(90deg,hsl(${p.h} 75% 55%),hsl(${(p.h + 50) % 360} 80% 60%))"></i></div></div>`;
      }).join('')}</div>`;
    const ex = (D.exp || []).filter(x => (x.at || '').slice(0, 7) == CM);
    if (ex.length) {
      const by = {};
      ex.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amt);
      const ks = Object.keys(by).sort((a, b) => by[b] - by[a]);
      o += `<div class="g"><h3>Expenses · ${ML(CM)}</h3><div class="dnw">${ring(ks.map((k, i) => [k, by[k], COLS[i % COLS.length]]), cmp(sum(ex, x => x.amt)), '')}<div class="lg4">${ks.slice(0, 4).map((k, i) => `<div><i style="background:${COLS[i % COLS.length]}"></i>${esc(k)}<b>${inr(by[k])}</b></div>`).join('')}</div></div></div>`;
    }
    return o + '</div>';
  }
  const _home = V.home;
  V.home = () => {
    const h = _home();
    if (!mgr())
      return h;
    const add = safe(insights);
    if (!add)
      return h;
    let j = h.indexOf('<h2>Overview</h2>');
    if (j < 0)
      j = h.indexOf('<h2');
    return j > 0 ? h.slice(0, j) + add + h.slice(j) : h + add;
  };
  if (document.body.classList.contains('ready'))
    safe(render);
})();
