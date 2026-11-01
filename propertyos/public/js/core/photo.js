// Pick a photo and shrink it on the phone, so uploads stay small on slow mobile data.
export async function downscalePhoto(file, { maxDim = 1280, maxChars = 330000 } = {}) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch {
    bmp = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  let w = bmp.width; let h = bmp.height;
  let scale = Math.min(1, maxDim / Math.max(w, h));
  for (let round = 0; round < 4; round++) {
    const cw = Math.max(1, Math.round(w * scale)); const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, 0, 0, cw, ch);
    for (const q of [0.74, 0.62, 0.5, 0.4]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (url.length <= maxChars) { if (bmp.close) bmp.close(); return url; }
    }
    scale *= 0.75;
  }
  throw new Error('photo_too_big');
}
