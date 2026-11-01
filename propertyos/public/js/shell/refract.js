// Tier 2 glass (Chromium only, opt-in): bends what is behind the dock like a thick lens at its rim.
// A small displacement map is drawn once on a canvas and used by an SVG filter inside backdrop-filter.
const NS = 'http://www.w3.org/2000/svg';
const ID = 'po-refract';
let svg = null;
let lastKey = '';
let bound = false;

function buildMap(w, h, radius, bezel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const hx = w / 2; const hy = h / 2;
  const bx = hx - radius; const by = hy - radius;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hx; const py = y + 0.5 - hy;
      const qx = Math.abs(px) - bx; const qy = Math.abs(py) - by;
      const ox = Math.max(qx, 0); const oy = Math.max(qy, 0);
      const dist = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius; // negative inside the shape
      const depth = -dist;
      let r = 128; let g = 128;
      if (depth >= 0 && depth < bezel) {
        const k = 1 - depth / bezel;
        const m = k * k * k; // strongest at the very edge, fades smoothly inwards
        let nx; let ny;
        if (ox > 0 || oy > 0) { const l = Math.hypot(ox, oy) || 1; nx = Math.sign(px) * ox / l; ny = Math.sign(py) * oy / l; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        r = 128 - nx * m * 127; g = 128 - ny * m * 127;
      }
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

function size() {
  const dock = document.querySelector('.dock');
  const r = dock ? dock.getBoundingClientRect() : null;
  const w = Math.round(r && r.width > 40 ? r.width : Math.min(window.innerWidth, 480) - 28);
  const h = Math.round(r && r.height > 20 ? r.height : 80);
  return { w: Math.max(80, Math.min(w, 720)), h: Math.max(40, Math.min(h, 160)) };
}

export function ensureRefract() {
  const { w, h } = size();
  const key = `${w}x${h}`;
  if (!svg) {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
    document.body.append(svg);
  }
  if (key !== lastKey) {
    lastKey = key;
    const radius = Math.min(34, h / 2);
    const url = buildMap(w, h, radius, Math.min(26, h / 2.4));
    svg.replaceChildren();
    const defs = document.createElementNS(NS, 'defs');
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', ID); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const img = document.createElementNS(NS, 'feImage');
    img.setAttribute('href', url); img.setAttribute('x', '0'); img.setAttribute('y', '0');
    img.setAttribute('width', String(w)); img.setAttribute('height', String(h)); img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('result', 'map');
    const disp = document.createElementNS(NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic'); disp.setAttribute('in2', 'map'); disp.setAttribute('scale', '30');
    disp.setAttribute('xChannelSelector', 'R'); disp.setAttribute('yChannelSelector', 'G');
    f.append(img, disp); defs.append(f); svg.append(defs);
  }
  if (!bound) {
    bound = true;
    let timer = 0;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => { if (document.documentElement.dataset.glass === '2') ensureRefract(); }, 250); });
  }
}
