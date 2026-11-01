// Draws a shareable visitor-pass picture (QR + code) so it can be sent on WhatsApp.
import { qrMatrix } from '../core/qr.js';

export async function passImageBlob({ name, purpose, place, code, token, until }) {
  const W = 720; const H = 1000;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const font = (w, s, f = 'system-ui, "Noto Sans", "Noto Sans Devanagari", sans-serif') => { x.font = `${w} ${s}px ${f}`; };

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3a8bff'); g.addColorStop(1, '#5a3fe0');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  const round = (px, py, w, h, r, fill) => {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); x.fillStyle = fill; x.fill();
  };
  round(40, 40, W - 80, H - 80, 44, '#ffffff');

  x.textAlign = 'center';
  x.fillStyle = '#5a3fe0'; font(700, 30); x.fillText('PropertyOS · Visitor pass', W / 2, 108);

  const q = qrMatrix(token);
  const quiet = 3;
  const mod = Math.floor(480 / (q.size + quiet * 2));
  const side = mod * (q.size + quiet * 2);
  const ox = Math.round((W - side) / 2); const oy = 140;
  x.fillStyle = '#fff'; x.fillRect(ox, oy, side, side);
  x.fillStyle = '#000';
  for (let r = 0; r < q.size; r++) for (let col = 0; col < q.size; col++) if (q.get(col, r)) x.fillRect(ox + (col + quiet) * mod, oy + (r + quiet) * mod, mod, mod);

  let y = oy + side + 76;
  x.fillStyle = '#0d1a2d'; font(700, 70, 'ui-monospace, Menlo, Consolas, monospace');
  x.fillText(`${code.slice(0, 3)} ${code.slice(3)}`, W / 2, y);
  y += 62; font(700, 40); x.fillStyle = '#0d1a2d'; x.fillText(name, W / 2, y, W - 140);
  if (purpose) { y += 46; font(500, 28); x.fillStyle = '#4a5972'; x.fillText(purpose, W / 2, y, W - 140); }
  y += 46; font(500, 28); x.fillStyle = '#4a5972'; x.fillText(place, W / 2, y, W - 140);
  y += 46; font(600, 28); x.fillStyle = '#0f9d68'; x.fillText(until, W / 2, y, W - 140);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

/** Share the pass picture if the phone allows it, otherwise share plain text. Returns true when something was shared. */
export async function sharePass(info, text) {
  try {
    const blob = await passImageBlob(info);
    const file = new File([blob], 'visitor-pass.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch (e) { if (e && e.name === 'AbortError') return true; }
  if (navigator.share) {
    try { await navigator.share({ text }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; }
  }
  return false;
}
