/* PropertyOS module 6: Brand studio (your own logo + name everywhere) and UX polish (focus, press/hover feedback, sheet motion, Esc to close). */
(() => {
  const D = 'assets/logo.png';
  const K = 'po-logo';
  const N = 'po-name';
  const ls = (k, v) => {
    try {
      return v === undefined ? localStorage.getItem(k) : v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    }
    catch (e) {
      return null;
    }
  };
  const name = () => ls(N) || 'PropertyOS';
  const mf = document.querySelector('link[rel=manifest]');
  const fix = i => {
    const s = i.getAttribute('src') || '';
    const l = ls(K);
    if (l) {
      if (s.endsWith(D) || s.endsWith('assets/logo.svg')) {
        i.dataset.bd = 1;
        i.setAttribute('src', l);
      }
    }
    else if (i.dataset.bd) {
      delete i.dataset.bd;
      i.setAttribute('src', D);
    }
  };
  const paint = () => {
    const e = document.querySelector('#sd [data-v="exp"]');
    const g = document.querySelector('#sd [data-v="set"]');
    if (e && g && (g.compareDocumentPosition(e) & 4))
      g.before(e);
    const n = name();
    document.querySelectorAll('img').forEach(fix);
    document.querySelectorAll('.br,.gc h1').forEach(e => {
      if (!e.children.length && (e.textContent == 'PropertyOS' || e.dataset.bn)) {
        e.dataset.bn = 1;
        if (e.textContent != n)
          e.textContent = n;
      }
    });
  };
  const man = async () => {
    const l = ls(K);
    const n = name();
    if (!l && n == 'PropertyOS') {
      mf.href = 'manifest.webmanifest';
      return;
    }
    try {
      const m = await (await fetch('manifest.webmanifest')).json();
      const b = new URL('./', location.href).href;
      Object.assign(m, {
        name: n, short_name: n.slice(0, 12), id: b, start_url: b, scope: b, icons: [{
            src: l || new URL(D, location.href).href, sizes: '256x256', type: 'image/png', purpose: 'any'
          }]
      });
      mf.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
    }
    catch (e) {
    }
  };
  const apply = () => {
    paint();
    document.title = name();
    document.querySelectorAll('link[rel=icon],link[rel=apple-touch-icon]').forEach(k => k.href = ls(K) || D);
    man();
  };
  /* canvas/poster code that builds new Image() with the default logo gets the custom one too */
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...d, set(v) {
      const l = ls(K);
      d.set.call(this, l && String(v).endsWith(D) ? l : v);
    }
  });
  let t = 0;
  new MutationObserver(() => {
    t || (t = requestAnimationFrame(() => {
      t = 0;
      paint();
    }));
  }).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['src']
  });
  if (ls(K) || ls(N))
    apply();
  /* ---- Brand studio ---- */
  A.brand = () => {
    modal(`<h3>Brand &amp; logo</h3><p style="color:var(--mu);margin:0 0 14px;font-size:14px">Your logo replaces the default everywhere: header, sign-in, rent cards, posters, browser tab and the installed app icon.</p><div class="bw"><canvas id="bc" class="bcv" width="256" height="256" aria-label="Logo preview"></canvas><div class="bcol"><label class="btn s" for="bf">Upload logo</label><input id="bf" type="file" accept="image/*" hidden><small class="lh">PNG, JPG, SVG or WebP. Drag the preview to reposition.</small><input id="bz" class="rng" type="range" min="1" max="3" step=".01" value="1" aria-label="Zoom" style="--p:0%"></div></div><small class="lh">Display name</small><input id="bn" maxlength="32" placeholder="PropertyOS" value="${name().replace(/"/g, '&quot;')}"><div class="bb"><button class="btn" id="bs">Save</button><button class="btn q" id="bx">Reset to default</button><button class="btn q" data-x>Cancel</button></div><small class="lh">Saved on this device. Use the same upload on each device you use.</small>`);
    const o = [...document.querySelectorAll('.ov')].pop();
    const $ = s => o.querySelector(s);
    const c = $('#bc');
    const x = c.getContext('2d');
    let im;
    let z = 1;
    let ox = 0;
    let oy = 0;
    let dirty = 0;
    let px = null;
    let py;
    const draw = () => {
      if (!im)
        return;
      const m = Math.min(im.width, im.height) / z;
      const lx = Math.max(0, (im.width - m) / 2 / m);
      const ly = Math.max(0, (im.height - m) / 2 / m);
      ox = Math.max(-lx, Math.min(lx, ox));
      oy = Math.max(-ly, Math.min(ly, oy));
      x.clearRect(0, 0, 256, 256);
      x.drawImage(im, (im.width - m) / 2 + ox * m, (im.height - m) / 2 + oy * m, m, m, 0, 0, 256, 256);
    };
    const use = s => {
      const i = new Image();
      i.onload = () => {
        im = i;
        z = 1;
        ox = oy = 0;
        $('#bz').value = 1;
        draw();
      };
      i.src = s;
    };
    use(ls(K) || D);
    $('#bf').onchange = e => {
      const f = e.target.files[0];
      if (!f)
        return;
      if (f.size > 8e6)
        return toast('Image too large (max 8 MB)');
      dirty = 1;
      use(URL.createObjectURL(f));
    };
    $('#bz').oninput = e => {
      const el = e.target; const mn=+el.min||0, mx=+el.max||1, v=+el.value;
      el.style.setProperty('--p', ((v-mn)/(mx-mn||1))*100 + '%');
      z = +e.target.value;
      dirty = 1;
      draw();
    };
    c.onpointerdown = e => {
      px = e.clientX;
      py = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove = e => {
      if (px == null)
        return;
      const w = c.clientWidth;
      ox -= (e.clientX - px) / w;
      oy -= (e.clientY - py) / w;
      px = e.clientX;
      py = e.clientY;
      dirty = 1;
      draw();
    };
    c.onpointerup = () => px = null;
    $('#bs').onclick = () => {
      if (dirty) {
        const u = c.toDataURL('image/png');
        ls(K, u);
        if (ls(K) !== u)
          return toast('Could not save: storage is full or blocked');
      }
      const n = $('#bn').value.trim().slice(0, 32);
      ls(N, n && n != 'PropertyOS' ? n : null);
      apply();
      toast('Brand saved ✓');
      o.remove();
    };
    $('#bx').onclick = () => {
      ls(K, null);
      ls(N, null);
      apply();
      toast('Default brand restored');
      o.remove();
    };
    setTimeout(() => $('#bn').focus(), 60);
  };
  const _s = V.set;
  V.set = () => _s().replace('data-a="look">Appearance</button>', 'data-a="look">Appearance</button><button class="btn q" data-a="brand">Brand &amp; logo</button>');
  /* ---- UX polish ---- */
  const st = document.createElement('style');
  st.textContent = `
:focus-visible {
  outline: 2px solid #0a84ff;
  outline-offset: 2px;
}

.btn,
.pill,
.row {
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .2s, filter .2s;
}

.btn:active,
.pill:active,
.row:active {
  transform: scale(.97);
}

@media(hover:hover) {
  .row:hover {
  transform: translateY(-2px);
  }
  .btn:hover {
  filter: brightness(1.06);
  }
}

.ov {
  animation: p6f .2s ease;
}

.ov .sh {
  animation: p6s .34s cubic-bezier(.2,.9,.25,1);
}

@keyframes p6f {
  from {
  opacity: 0;
  }
}

@keyframes p6s {
  from {
  transform: translateY(28px) scale(.98);
  opacity: 0;
  }
}

.bw {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}

.bcv {
  width: 116px;
  height: 116px;
  flex: none;
  border-radius: 28px;
  cursor: grab;
  touch-action: none;
  background: repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px;
  box-shadow: 0 8px 24px #0003;
}

.bcv:active {
  cursor: grabbing;
}

.bcol {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.bcol input {
  width: 100%;
}

#bf {
  display: none!important;
}

.bcol input[type=range] {
  padding: 0;
  background: none;
  border: 0;
  box-shadow: none;
}

.bb {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0 10px;
}

#rl {
  white-space: nowrap;
  flex: none;
}

.lg4 {
  display: grid;
  gap: 9px;
  flex: 1;
  min-width: 0;
}

.lg4>div {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.lg4 b {
  margin-left: auto;
  padding-left: 10px;
}

@media(max-width:430px) {
  header {
  gap: 8px;
  }
  #rl {
  padding: 7px 12px;
  font-size: 12px;
  }
}

@media(min-width:1500px) {
  .app {
  max-width: 1240px;
  }
}

@media(prefers-reduced-motion:reduce) {
  *,
  *::before,
  *::after {
  animation-duration: .01ms!important;
  transition-duration: .01ms!important;
  }
}
`;
  document.head.append(st);
  document.addEventListener('keydown', e => {
    if (e.key == 'Escape') {
      const o = [...document.querySelectorAll('.ov')].pop();
      o && o.remove();
    }
  });
})();
