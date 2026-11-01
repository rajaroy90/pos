// Small QR Code encoder (ISO/IEC 18004): byte mode, error-correction level M, versions 1-10 (up to 213 bytes).
// Pure functions, no DOM, so it runs in the browser and under Node tests.

// Level M block layout per version: [ecCodewordsPerBlock, [[blockCount, dataCodewordsPerBlock], ...]]
const M_BLOCKS = [
  null,
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
export const MAX_BYTES = 213;

// GF(256), primitive polynomial 0x11d
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly; // highest degree first, leading 1
}

function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const rem = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= gmul(gen[i + 1], factor);
  }
  return rem;
}

const dataCapacity = (v) => M_BLOCKS[v][1].reduce((s, [n, d]) => s + n * d, 0);

function pickVersion(len) {
  for (let v = 1; v <= 10; v++) {
    const countBits = v < 10 ? 8 : 16;
    if (4 + countBits + len * 8 <= dataCapacity(v) * 8) return v;
  }
  throw new Error('qr_too_long');
}

function encodeData(bytes, version) {
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const cap = dataCapacity(version) * 8;
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    out.push(v);
  }
  for (let pad = 0xec; out.length < dataCapacity(version); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

function interleave(data, version) {
  const [ecLen, groups] = M_BLOCKS[version];
  const blocks = [];
  let pos = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) {
      const d = data.slice(pos, pos + size);
      pos += size;
      blocks.push({ d, e: rsRemainder(d, ecLen) });
    }
  }
  const out = [];
  const maxD = Math.max(...blocks.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);
  return out;
}

const bit = (n, i) => ((n >>> i) & 1) === 1;

function buildMatrix(version, codewords) {
  const size = 17 + 4 * version;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };

  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const ap = ALIGN[version];
  for (let i = 0; i < ap.length; i++) {
    for (let j = 0; j < ap.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  // reserve format areas (real bits are drawn later)
  const drawFormat = (maskNo) => {
    const data = (0b00 << 3) | maskNo; // EC level M = 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
    setFn(8, 7, bit(bits, 6));
    setFn(8, 8, bit(bits, 7));
    setFn(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(a, b, bit(bits, i));
      setFn(b, a, bit(bits, i));
    }
  }
  // place data bits
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && k < codewords.length * 8) {
          mod[y][x] = bit(codewords[k >>> 3], 7 - (k & 7));
          k++;
        }
      }
    }
  }
  return { size, mod, fn, drawFormat };
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(m, n) {
  for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) if (!m.fn[y][x] && MASKS[n](x, y)) m.mod[y][x] = !m.mod[y][x];
}

function penalty(m) {
  const { size, mod } = m;
  let score = 0;
  const runScore = (get) => {
    let s = 0;
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        if (get(a, b) === get(a, b - 1)) run++;
        else { if (run >= 5) s += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) s += 3 + (run - 5);
    }
    return s;
  };
  score += runScore((r, c) => mod[r][c]) + runScore((c, r) => mod[r][c]);
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = mod[y][x];
    if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
  }
  const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const match = (get, a, b, pat) => { for (let i = 0; i < 11; i++) if ((get(a, b + i) ? 1 : 0) !== pat[i]) return false; return true; };
  for (let a = 0; a < size; a++) for (let b = 0; b + 11 <= size; b++) {
    for (const pat of [A, B]) {
      if (match((r, c) => mod[r][c], a, b, pat)) score += 40;
      if (match((c, r) => mod[r][c], a, b, pat)) score += 40;
    }
  }
  let dark = 0;
  for (const row of mod) for (const v of row) if (v) dark++;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

/** Encode text to a QR matrix. Returns { size, get(x, y) -> boolean }. */
export function qrMatrix(text, forceMask = -1) {
  const bytes = new TextEncoder().encode(String(text));
  if (bytes.length > MAX_BYTES) throw new Error('qr_too_long');
  const version = pickVersion(bytes.length);
  const codewords = interleave(encodeData([...bytes], version), version);
  let best = null;
  for (let n = 0; n < 8; n++) {
    if (forceMask >= 0 && n !== forceMask) continue;
    const m = buildMatrix(version, codewords);
    applyMask(m, n);
    m.drawFormat(n);
    const p = penalty(m);
    if (!best || p < best.p) best = { p, m };
  }
  const { size, mod } = best.m;
  return { size, version, get: (x, y) => mod[y][x] };
}

/** SVG path data for the dark modules (1 unit per module, offset by the quiet zone). */
export function qrPath(text, quiet = 2) {
  const q = qrMatrix(text);
  let d = '';
  for (let y = 0; y < q.size; y++) {
    let x = 0;
    while (x < q.size) {
      if (!q.get(x, y)) { x++; continue; }
      let x2 = x;
      while (x2 < q.size && q.get(x2, y)) x2++;
      d += `M${x + quiet} ${y + quiet}h${x2 - x}v1h${x - x2}z`;
      x = x2;
    }
  }
  return { d, size: q.size + quiet * 2 };
}
