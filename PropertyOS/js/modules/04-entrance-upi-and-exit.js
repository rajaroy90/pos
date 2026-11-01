/* PropertyOS module 4: premium entrance (landing, sign-in, public rentals + inquiry), guided journey (setup checklist, skeleton),
   graceful exit (before-you-go, farewell, unsaved guard), UPI/QR hub (rounded QR, app deep links, PNG, poster, proof), speed (lite mode, content-visibility). */
(() => {
  const enc = encodeURIComponent;
  const safe = f => {
    try {
      return f();
    }
    catch (e) {
      return null;
    }
  };
  const mu = 'style="color:var(--mu)"';
  const LOGO = '<div class="logo" style="margin:0 auto 14px;width:64px;height:64px;border-radius:20px"><img src="assets/logo.png" alt=""></div>';
  const coarse = matchMedia('(pointer:coarse)').matches;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  let instEv = null;
  let bye = 0;
  let LST = [];
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    instEv = e;
  });
  addEventListener('appinstalled', () => {
    instEv = null;
    toast('Installed ✓');
  });
  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.textContent = `
.ov {
  z-index: 60;
}

#ts {
  z-index: 99;
}

.lite .bl i {
  animation: none;
  filter: blur(48px);
}

.idle .bl i {
  animation-play-state: paused;
}

.lite .lgx .btn.q,
.lite .lgx .ch .pill,
.lite .lgx nav.tb,
.lite .lgx .pill.g,
.lite .lgx .rcb {
  backdrop-filter: blur(10px)!important;
  -webkit-backdrop-filter: blur(10px)!important;
}

.row {
  content-visibility: auto;
  contain-intrinsic-size: auto 76px;
}

@media(prefers-reduced-motion:reduce) {
  * {
  animation-duration: .01ms!important;
  animation-iteration-count: 1!important;
  transition-duration: .01ms!important;
  }
}

#gate.lp {
  align-items: flex-start;
  justify-content: center;
  padding: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.lpw {
  width: min(1040px,100%);
  padding: max(14px,env(safe-area-inset-top)) 18px 40px;
  box-sizing: border-box;
}

.lpn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  border-radius: 99px;
  margin-bottom: 34px;
}

.lpn b {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
}

.lpn .logo {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  margin: 0;
}

.hero4 {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 30px;
  align-items: center;
  text-align: left;
}

.chip4 {
  display: inline-block;
  padding: 7px 14px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  background: var(--fl);
  box-shadow: inset 0 0 0 1px var(--gb);
}

.hero4 h1 {
  font-size: clamp(38px,7vw,64px);
  line-height: 1.02;
  margin: 16px 0 14px;
  letter-spacing: -.03em;
}

.gr {
  background: linear-gradient(90deg,var(--ac),#af52de 60%,#ff2d78);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero4 p.lead {
  font-size: 18px;
  line-height: 1.5;
  color: var(--mu);
  margin: 0 0 22px;
  max-width: 520px;
}

.ctas {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ctas .btn {
  padding: 14px 24px;
  font-size: 16px;
}

.trust {
  display: flex;
  gap: 8px 16px;
  flex-wrap: wrap;
  margin-top: 22px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mu);
}

.mock {
  padding: 22px;
  border-radius: 34px;
  text-align: center;
  max-width: 340px;
  margin: 0 auto;
  animation: fl4 6s ease-in-out infinite;
}

.mock small {
  color: var(--mu);
  font-weight: 600;
}

.mock h2 {
  font-size: 34px;
  margin: 4px 0 12px;
}

.mock .qb {
  margin: 8px 0;
}

.mock .pd {
  display: inline-block;
  margin-top: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  font-weight: 700;
  font-size: 13px;
  background: color-mix(in srgb,var(--ok) 22%,transparent);
  color: var(--ok);
}

@keyframes fl4 {
  50% {
  transform: translateY(-10px) rotate(.6deg);
  }
}

.sec4 {
  margin: 64px 0 0;
  text-align: left;
}

.sec4>h2 {
  font-size: clamp(26px,4.5vw,38px);
  letter-spacing: -.02em;
  margin: 0 0 6px;
}

.sec4>p {
  color: var(--mu);
  margin: 0 0 22px;
}

.fg4 {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
  gap: 14px;
}

.fc4 {
  padding: 20px;
  border-radius: 26px;
  transition: transform .35s cubic-bezier(.3,1.6,.5,1);
}

.fc4:hover {
  transform: translateY(-4px);
}

.fc4 i {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  font-style: normal;
  font-size: 22px;
  background: var(--fl);
  box-shadow: inset 0 0 0 1px var(--gb);
  margin-bottom: 12px;
}

.fc4 b {
  display: block;
  font-size: 17px;
  margin-bottom: 4px;
}

.fc4 span {
  color: var(--mu);
  font-size: 14px;
  line-height: 1.45;
}

.st4 {
  counter-reset: s;
}

.st4 .fc4 {
  position: relative;
  padding-top: 34px;
}

.st4 .fc4:before {
  counter-increment: s;
  content: counter(s);
  position: absolute;
  top: -14px;
  left: 18px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg,var(--ac),#af52de);
  box-shadow: 0 6px 16px var(--sh);
}

.ls4 {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 4px 2px 14px;
  scroll-snap-type: x mandatory;
}

.ls4>div {
  flex: 0 0 min(290px,82%);
  scroll-snap-align: start;
  border-radius: 26px;
  overflow: hidden;
}

.ls4 .im {
  height: 150px;
  background-size: cover;
  background-position: center;
}

.ls4 .bd {
  padding: 14px 16px 16px;
  text-align: left;
}

.ls4 b {
  display: block;
  font-size: 17px;
}

.ls4 .pr {
  font-size: 20px;
  font-weight: 800;
  margin: 6px 0 10px;
}

.cta4 {
  margin-top: 64px;
  padding: 34px 20px;
  border-radius: 34px;
  text-align: center;
}

.cta4 h2 {
  font-size: clamp(26px,4.5vw,38px);
  margin: 0 0 8px;
}

.cta4 p {
  color: var(--mu);
  margin: 0 0 18px;
}

.ft4 {
  margin-top: 28px;
  text-align: center;
  color: var(--mu);
  font-size: 13px;
}

.ft4 a {
  color: var(--ac);
  cursor: pointer;
  font-weight: 600;
}

.rv {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity .7s, transform .7s cubic-bezier(.2,.9,.3,1);
}

.rv.in {
  opacity: 1;
  transform: none;
}

@media(max-width:760px) {
  .hero4 {
  grid-template-columns: 1fr;
  }
  .mock {
  order: -1;
  max-width: 290px;
  }
}

.ax {
  width: min(420px,100%)!important;
}

.ax h1 {
  font-size: 28px!important;
  margin: 0 0 4px;
}

.ax p.m {
  color: var(--mu);
  margin: 0 0 16px;
}

.ax .seg {
  margin: 0 0 16px;
}

.pwl {
  position: relative;
  display: block;
}

.pwl input {
  padding-right: 48px;
}

.pwl button {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-38%);
  border: 0;
  background: none;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
}

.pws {
  height: 5px;
  border-radius: 9px;
  background: var(--fl);
  margin: -4px 0 6px;
  overflow: hidden;
}

.pws i {
  display: block;
  height: 100%;
  width: 0;
  border-radius: 9px;
  transition: width .3s, background .3s;
}

.ax small {
  display: block;
  text-align: left;
  color: var(--mu);
  margin-bottom: 10px;
}

.ax a {
  color: var(--ac);
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
}

.skl {
  width: min(360px,90%);
  text-align: center;
}

.skl i {
  display: block;
  height: 14px;
  border-radius: 9px;
  margin: 12px auto;
  background: linear-gradient(90deg,var(--fl),var(--gb),var(--fl));
  background-size: 200% 100%;
  animation: sk 1.3s linear infinite;
}

@keyframes sk {
  to {
  background-position: -200% 0;
  }
}

.skl .logo {
  animation: pu 1.6s ease-in-out infinite;
}

@keyframes pu {
  50% {
  transform: scale(1.08);
  }
}

.cl {
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 26px;
  text-align: left;
}

.cl .hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.cl .bar {
  height: 6px;
  border-radius: 9px;
  background: var(--fl);
  margin: 10px 0 12px;
  overflow: hidden;
}

.cl .bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg,var(--ac),#af52de);
  border-radius: 9px;
  transition: width .6s;
}

.cl .it {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-weight: 600;
  font-size: 15px;
}

.cl .it em {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 12px;
  color: #fff;
  background: var(--fl);
  box-shadow: inset 0 0 0 1.5px var(--gb);
}

.cl .it.ok {
  color: var(--mu);
}

.cl .it.ok em {
  background: var(--ok);
  box-shadow: none;
}

.cl .it.ok b {
  text-decoration: line-through;
  font-weight: 500;
}

.cl .it b {
  flex: 1;
}

.uh {
  text-align: center;
}

.uh h3 {
  font-size: 30px;
  margin: 2px 0;
}

.qf {
  display: inline-block;
  padding: 12px;
  border-radius: 30px;
  margin: 12px 0 8px;
  background: linear-gradient(135deg,var(--ac),#af52de 60%,#ff2d78);
  box-shadow: 0 16px 40px var(--sh);
}

.qf svg {
  display: block;
  max-width: 100%;
  height: auto;
}

.cp4 {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  border-radius: 99px;
  border: 0;
  background: var(--fl);
  color: var(--tx);
  font: 600 14px inherit;
  font-family: inherit;
  box-shadow: inset 0 0 0 1px var(--gb);
  cursor: pointer;
  margin-bottom: 12px;
}

.ap4 {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 8px;
  margin: 6px 0 10px;
}

.ap4 a {
  display: block;
  text-align: center;
  text-decoration: none;
  padding: 12px 8px;
  border-radius: 16px;
  font-weight: 700;
  color: var(--tx);
  background: var(--fl);
  box-shadow: inset 0 0 0 1px var(--gb);
}

.ac4 {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.ac4 .btn {
  padding: 12px 6px;
  font-size: 14px;
}

.poster {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow: auto;
  background: rgba(5,10,30,.55);
  backdrop-filter: blur(8px);
}

.poster .pp {
  width: min(440px,100%);
  background: #fff;
  color: #0b1226;
  border-radius: 30px;
  padding: 30px 24px;
  text-align: center;
  box-shadow: 0 30px 80px rgba(0,0,0,.4);
}

.poster .pb {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 99px;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: .08em;
  color: #fff;
  background: linear-gradient(90deg,#0a84ff,#af52de);
}

.poster h1 {
  font-size: 30px;
  margin: 14px 0 2px;
  color: #0b1226;
}

.poster h2 {
  font-size: 20px;
  margin: 0 0 12px;
  color: #0a84ff;
}

.poster .pu {
  font-size: 20px;
  font-weight: 800;
  margin: 10px 0 2px;
}

.poster p {
  margin: 4px 0;
  color: #445;
}

.poster .noprint {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 18px;
}

@media print {
  body>*:not(.poster) {
  display: none!important;
  }
  .poster {
  position: static;
  background: #fff!important;
  backdrop-filter: none;
  display: block;
  padding: 0;
  }
  .poster .pp {
  box-shadow: none;
  margin: 0 auto;
  }
  .noprint {
  display: none!important;
  }
}

.iq {
  text-align: left;
}

.iq h3 {
  margin: 0 0 4px;
}

.ok4 {
  text-align: center;
  padding: 10px 0;
}

.ok4 i {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  font-style: normal;
  font-size: 30px;
  color: #fff;
  background: var(--ok);
  box-shadow: 0 10px 26px color-mix(in srgb,var(--ok) 50%,transparent);
  animation: pp .6s cubic-bezier(.3,1.6,.5,1);
}

@keyframes pp {
  from {
  transform: scale(0);
  }
}

.xs {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  margin: 12px 0;
}

.xs div {
  padding: 12px 6px;
  border-radius: 16px;
  background: var(--fl);
  text-align: center;
}

.xs b {
  display: block;
  font-size: 18px;
}

.xs small {
  color: var(--mu);
  font-weight: 600;
  font-size: 11px;
}
`;
  document.head.append(css);
  if ((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || matchMedia('(prefers-reduced-motion:reduce)').matches)
    document.documentElement.classList.add('lite');
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('idle', document.hidden));
  /* ---------- QR (rounded modules, error-correction Q) ---------- */
  function qr2(t, o = {}) {
    const q = new QRCode(-1, QRErrorCorrectLevel.Q);
    q.addData(t);
    q.make();
    const n = q.getModuleCount();
    const p = o.pad ?? 4;
    const z = o.size || 220;
    let d = '';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (q.isDark(r, c)) {
          const x = c + p;
          const y = r + p;
          d += `M${x + .15} ${y + .15}h.7v.7h-.7z`;
        }
    return `<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ${n + 2 * p} ${n + 2 * p}" width="${z}" height="${z}" role="img" aria-label="UPI QR code" style="border-radius:18px;fill:none;stroke:none"><rect width="100%" height="100%" style="fill:#fff;stroke:none"/><path d="${d}" style="fill:#0b1226;stroke:#0b1226;stroke-width:.3px;stroke-linejoin:round"/></svg>`;
  }
  const rr = (x, a, b, w, h, r) => {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath();
  };
  async function qrPng(t, { title = '', sub = '', foot = '' } = {}) {
    const url = URL.createObjectURL(new Blob([qr2(t, { size: 760 })], { type: 'image/svg+xml' }));
    const im = new Image();
    await new Promise((ok, no) => {
      im.onload = ok;
      im.onerror = no;
      im.src = url;
    });
    const W = 1080;
    const H = 1300;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#0a84ff');
    gr.addColorStop(.6, '#af52de');
    gr.addColorStop(1, '#ff2d78');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff';
    rr(x, 50, 50, W - 100, H - 100, 60);
    x.fill();
    x.textAlign = 'center';
    x.fillStyle = '#0b1226';
    x.font = '800 58px system-ui,sans-serif';
    x.fillText(title.slice(0, 28), W / 2, 170);
    x.font = '600 34px system-ui,sans-serif';
    x.fillStyle = '#0a84ff';
    x.fillText('Scan with any UPI app', W / 2, 225);
    x.drawImage(im, 160, 270, 760, 760);
    x.fillStyle = '#0b1226';
    x.font = '800 48px system-ui,sans-serif';
    x.fillText(sub.slice(0, 30), W / 2, 1105);
    x.font = '500 30px system-ui,sans-serif';
    x.fillStyle = '#667';
    x.fillText(foot.slice(0, 48), W / 2, 1165);
    x.fillText('GPay · PhonePe · Paytm · BHIM', W / 2, 1215);
    URL.revokeObjectURL(url);
    return new Promise(r => c.toBlob(r, 'image/png'));
  }
  const saveBlob = async (b, name) => {
    const f = new File([b], name, { type: b.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: name });
        return;
      }
      catch (e) {
        if (e.name == 'AbortError')
          return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
  };
  const copy = t => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => toast('Copy failed'));
  /* ---------- UPI hub ---------- */
  const tr = id => 'PO' + String(id).replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase();
  const upiURL = (o, s = 'upi://pay') => `${s}?pa=${enc(o.pa)}&pn=${enc(o.pn || '')}${o.am > 0 ? '&am=' + (+o.am).toFixed(2) : ''}&cu=INR${o.tn ? '&tn=' + enc(o.tn.slice(0, 50)) : ''}${o.tr ? '&tr=' + enc(o.tr) : ''}`;
  const APPS = [['GPay', 'tez://upi/pay'], ['PhonePe', 'phonepe://pay'], ['Paytm', 'paytmmp://pay'], ['Any UPI app', 'upi://pay']];
  const myUpi = () => D.upi || ls('po-upi-' + ORG) || '';
  let HUB = null;
  function hub(o, m) {
    const u = upiURL(o);
    HUB = { o, u, m };
    modal(`<div class="uh"><small ${mu}>${esc(m.month || '')}</small><h3>${esc(m.title)}</h3><span ${mu}>${esc(m.who || '')}</span><div><div class="qf">${qr2(u, { size: 230 })}</div></div>
<div><button class="cp4" data-a="uId">${esc(o.pa)} · copy</button></div>
${mgr() ? '' : `<div class="ap4">${coarse || ios ? APPS.map(([n, s]) => `<a href="${esc(upiURL(o, s))}" data-a="uOpen">${n}</a>`).join('') : ''}</div>`}
<div class="ac4">${mgr() ? `<button class="btn q" data-a="uWa">WhatsApp tenant</button><button class="btn q" data-a="uShare">Share link</button>` : `<button class="btn" data-a="uPaid">I’ve paid ✓</button><button class="btn q" data-a="uShare">Share</button>`}<button class="btn q" data-a="uPng">Save QR image</button><button class="btn q" data-a="uLink">Copy UPI link</button></div>
<button class="btn q" data-x style="width:100%">Close</button></div>`);
  }
  A.payqr = e => {
    const c = g('charges', e.dataset.i);
    if (!c)
      return;
    const v = myUpi();
    if (!v) {
      if (mgr()) {
        toast('Set your UPI ID first');
        return A.upi();
      }
      return toast('UPI payment is not set up yet');
    }
    if (bal(c) <= 0)
      return toast('Already paid ✓');
    const i = info(g('leases', c.lid));
    hub({
      pa: v, pn: D.org, am: bal(c), tn: `Rent ${MF(c.m)} ${i.u.name}`, tr: tr(c.id)
    }, {
      title: 'Pay ' + inr(bal(c)), who: `${i.t.name} · ${i.p.name} ${i.u.name}`, month: MF(c.m), phone: i.t.phone, name: i.t.name, unit: i.u.name
    });
  };
  A.upiqr = () => {
    const v = myUpi();
    if (!v) {
      toast('Set your UPI ID first');
      return A.upi();
    }
    hub({ pa: v, pn: D.org }, { title: 'Rent QR', who: 'Tenants enter the amount themselves', month: D.org });
  };
  A.uId = () => copy(HUB.o.pa);
  A.uLink = () => copy(HUB.u);
  A.uOpen = () => {
    window._upiT = Date.now();
  };
  A.uShare = async () => {
    const { o, u, m } = HUB;
    const t = `${m.title} to ${D.org} by UPI. UPI ID: ${o.pa}${o.am ? ' · Amount ' + inr(o.am) : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: D.org, text: t, url: u.startsWith('upi:') ? undefined : u });
      }
      catch (e) {
      }
    }
    else
      copy(t + '\n' + u);
  };
  A.uWa = () => {
    const { o, u, m } = HUB;
    let p = String(m.phone || '').replace(/\D/g, '');
    if (p.length == 10)
      p = '91' + p;
    const t = `Hi ${(m.name || '').split(' ')[0]}, rent for ${m.month} (${m.unit}) is ${inr(o.am)}. Pay by UPI to ${o.pa}, or tap: ${u}`;
    window.open((p ? `https://wa.me/${p}` : 'https://wa.me/') + '?text=' + enc(t), '_blank', 'noopener');
  };
  A.uPng = async () => {
    try {
      const { o, m } = HUB;
      const b = await qrPng(HUB.u, { title: D.org, sub: o.am ? inr(o.am) : o.pa, foot: o.am ? `${m.month} · ${o.pa}` : 'Pay your rent by UPI' });
      await saveBlob(b, `upi-${(D.org || 'rent').toLowerCase().replace(/\W+/g, '-')}.png`);
    }
    catch (e) {
      toast('Could not create image');
    }
  };
  A.uPaid = () => {
    const { o, m } = HUB;
    sheet('Share payment proof', [{ k: 'r', l: 'UPI reference / UTR (optional, 8–16 digits)', v: '' }], async (f) => {
      const r = f.r.trim();
      if (r && !/^\d{8,16}$/.test(r))
        bad('Reference should be 8–16 digits');
      const t = `Paid ${inr(o.am)} for rent ${m.month} (${m.unit}) via UPI${r ? '. Ref: ' + r : ''}.`;
      if (navigator.share) {
        try {
          await navigator.share({ text: t });
        }
        catch (e) {
        }
      }
      else
        copy(t);
    }, 'Share');
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window._upiT && Date.now() - window._upiT < 6e5) {
      window._upiT = 0;
      toast('Back from UPI? Tap “I’ve paid” to share proof');
    }
  });
  A.poster = () => {
    const v = myUpi();
    if (!v) {
      toast('Set your UPI ID first');
      return A.upi();
    }
    const u = upiURL({ pa: v, pn: D.org });
    const w = document.createElement('div');
    w.className = 'poster';
    w.innerHTML = `<div class="pp"><span class="pb">PROPERTYOS</span><h1>${esc(D.org)}</h1><h2>Scan &amp; pay rent</h2>${qr2(u, { size: 380 })}<p class="pu">${esc(v)}</p><p>GPay · PhonePe · Paytm · BHIM · any UPI app</p><div class="noprint"><button class="btn" id="pp1">Print</button><button class="btn q" id="pp2">Close</button></div></div>`;
    document.body.append(w);
    w.querySelector('#pp1').onclick = () => print();
    w.querySelector('#pp2').onclick = () => w.remove();
    w.onclick = e => {
      if (e.target == w)
        w.remove();
    };
  };
  const _set = V.set;
  V.set = () => {
    let h = _set();
    if (mgr())
      h = h.replace('data-a="upi">UPI ID</button>', 'data-a="upi">UPI ID</button><button class="btn s q" data-a="upiqr">Rent QR</button><button class="btn s q" data-a="poster">Poster</button>');
    if (instEv || ios)
      h = h.replace('data-a="theme">Theme</button>', 'data-a="theme">Theme</button><button class="btn q" data-a="inst">Install app</button>');
    return h;
  };
  A.inst = async () => {
    if (instEv) {
      instEv.prompt();
      await safe(() => instEv.userChoice);
      instEv = null;
    }
    else
      toast('Tap Share, then “Add to Home Screen”');
  };
  /* ---------- Entrance: landing, auth, farewell, onboarding ---------- */
  const inv = () => {
    const p = new URLSearchParams(location.search);
    return p.get('invite') || p.get('r') || p.get('c');
  };
  const hue = s => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const FEAT = [['📲', 'UPI rent QR', 'Every charge gets a scannable QR with the exact amount. Tenants pay from GPay, PhonePe or Paytm.'], ['💬', 'WhatsApp reminders', 'One tap sends a polite reminder with the UPI link to every overdue tenant.'], ['📑', 'Leases & tenants', 'Start, renew and end leases. Invite tenants to their own portal.'], ['🛠️', 'Repairs', 'Tenants report issues; you track them from new to resolved.'], ['📈', 'Profit & cash flow', 'Log expenses and see profit by property with a 12-month cash-flow view.'], ['⚡', 'Realtime & offline', 'Changes sync live across devices, and the app opens even without a signal.']];
  function landing() {
    const n = new Date();
    const mo = n.toLocaleString('en', { month: 'long' });
    const u = upiURL({
      pa: 'demo@upi', pn: 'PropertyOS Demo', am: 15000, tn: 'Rent ' + mo
    });
    gate(`<div class="lpw"><div class="g lpn"><b><span class="logo"><img src="assets/logo.png" alt=""></span>PropertyOS</b><button class="btn q s" data-lp="in">Sign in</button></div>
<div class="hero4"><div><span class="chip4">🇮🇳 Built for India · UPI-first</span><h1>Collect rent. <span class="gr">Beautifully.</span></h1><p class="lead">Leases, tenants, repairs and UPI rent QR codes in one liquid-glass app. Free to start, fast on any phone, and works offline.</p>
<div class="ctas"><button class="btn" data-lp="up">Get started free</button><button class="btn q" data-lp="in">Sign in</button></div><div class="trust"><span>✓ Free to start</span><span>✓ Row-level security</span><span>✓ Installs like an app</span></div></div>
<div class="g mock"><small>Rent · ${mo}</small><h2>₹15,000</h2><div class="qb">${qr2(u, { size: 170 })}</div><span class="pd">Paid via UPI ✓</span></div></div>
<div class="sec4 rv"><h2>Everything a landlord needs</h2><p>No spreadsheets, no chasing. Built around how rent really works in India.</p><div class="fg4">${FEAT.map(f => `<div class="g fc4"><i>${f[0]}</i><b>${f[1]}</b><span>${f[2]}</span></div>`).join('')}</div></div>
<div class="sec4 rv"><h2>Up and running in minutes</h2><p>Three steps from sign-up to your first UPI payment.</p><div class="fg4 st4"><div class="g fc4"><b>Create your workspace</b><span>Name your business and add your UPI ID.</span></div><div class="g fc4"><b>Add properties &amp; tenants</b><span>Units, leases and tenant invites in a few taps.</span></div><div class="g fc4"><b>Share the QR, get paid</b><span>Generate rent, send reminders, record payments.</span></div></div></div>
<div class="sec4 rv" id="lpL" hidden><h2>Available to rent</h2><p>Browse homes from landlords on PropertyOS and send an inquiry.</p><div class="ls4" id="lpC"></div></div>
<div class="g cta4 rv"><h2>Ready to get paid on time?</h2><p>Create your free workspace in under a minute.</p><div class="ctas" style="justify-content:center"><button class="btn" data-lp="up">Create free account</button></div><p style="margin:14px 0 0;font-size:13px">Invited by your landlord? <a data-lp="in" style="color:var(--ac);cursor:pointer;font-weight:600">Sign in as tenant</a></p></div>
<div class="ft4">© ${n.getFullYear()} PropertyOS · Made in India · <a data-lp="in">Sign in</a></div></div>`);
    const e = $('#gate');
    e.classList.add('lp');
    e.scrollTop = 0;
    const io = new IntersectionObserver(a => a.forEach(x => {
      if (x.isIntersecting) {
        x.target.classList.add('in');
        io.unobserve(x.target);
      }
    }), { threshold: .12 });
    e.querySelectorAll('.rv').forEach(x => io.observe(x));
    loadList();
  }
  async function loadList() {
    try {
      const { data, error } = await sb.from('public_listings').select('unit_id,property_id,unit_name,bedrooms,rent,property_name,city,image_url,org_name').order('rent').limit(12);
      if (error || !data || !data.length)
        return;
      LST = data;
      const c = $('#lpC');
      if (!c)
        return;
      c.innerHTML = data.map((x, i) => `<div class="g"><div class="im" style="background-image:${x.image_url ? `url('${esc(x.image_url)}')` : `linear-gradient(135deg,hsl(${hue(x.property_id)} 80% 62%),hsl(${(hue(x.property_id) + 60) % 360} 80% 66%))`}"></div><div class="bd"><b>${esc(x.property_name)} · ${esc(x.unit_name)}</b><span ${mu}>${esc(x.city || '')}${x.bedrooms ? ' · ' + x.bedrooms + ' BHK' : ''}</span><div class="pr">${inr(x.rent / 100)}<small ${mu}> /month</small></div><button class="btn s" data-lp="enq" data-i="${i}">Enquire</button></div></div>`).join('');
      $('#lpL').hidden = false;
    }
    catch (e) {
    }
  }
  function enquire(i) {
    const x = LST[i];
    if (!x)
      return;
    let nm = ls('po-vn') || '';
    let ph = ls('po-vp') || '';
    let em = ls('po-email') || '';
    modal(`<div class="iq"><h3>Enquire about ${esc(x.property_name)} · ${esc(x.unit_name)}</h3><p ${mu} style="margin:0 0 14px">${inr(x.rent / 100)}/month · ${esc(x.org_name)} will reply to you directly.</p><form id="iqf" autocomplete="on"><label>Your name<input name="n" value="${esc(nm)}" autocomplete="name" required></label><label>Phone<input name="p" type="tel" value="${esc(ph)}" autocomplete="tel" inputmode="tel" required></label><label>Email<input name="e" type="email" value="${esc(em)}" autocomplete="email" required></label><label>Message<textarea name="m" rows="3" required>I’m interested in this home. Is it still available?</textarea></label><p id="iqm" style="color:var(--er);min-height:18px;margin:0 0 8px;font-size:14px"></p><div class="ac"><button class="btn q" type="button" data-x>Cancel</button><button class="btn" type="submit">Send inquiry</button></div></form></div>`);
    const f = $('#iqf');
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const d = new FormData(f);
      const b = f.querySelector('[type=submit]');
      b.disabled = true;
      b.textContent = 'Sending…';
      const { error } = await sb.rpc('submit_inquiry', {
        p_property: x.property_id, p_name: d.get('n'), p_email: d.get('e'), p_phone: d.get('p'), p_message: d.get('m')
      });
      if (error) {
        $('#iqm').textContent = error.message;
        b.disabled = false;
        b.textContent = 'Send inquiry';
        return;
      }
      ls('po-vn', d.get('n'));
      ls('po-vp', d.get('p'));
      f.closest('.iq').innerHTML = `<div class="ok4"><i>✓</i><h3>Inquiry sent</h3><p ${mu}>${esc(x.org_name)} has your details and will contact you on ${esc(d.get('p'))}.</p><div class="ac" style="justify-content:center"><button class="btn q" data-x>Keep browsing</button><button class="btn" data-lp="up" data-x>Create account</button></div></div>`;
    };
  }
  const pwScore = p => {
    let s = 0;
    if (p.length >= 8)
      s++;
    if (p.length >= 12)
      s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p))
      s++;
    if (/\d/.test(p))
      s++;
    if (/[^\w]/.test(p))
      s++;
    return Math.min(s, 4);
  };
  function authForm(mode = 'in', m = '') {
    const up = mode == 'up';
    const em = ls('po-email') || '';
    const iv = !!inv();
    $('#gate').classList.remove('lp');
    gate(`<div class="g gc ax">${LOGO}<h1>${up ? 'Create your account' : 'Welcome back'}</h1><p class="m">${iv ? 'You were invited. Use the email your landlord invited.' : up ? 'Start free. No card needed.' : 'Sign in to your workspace.'}</p>
<div class="seg"><button data-ax="in" class="${up ? '' : 'on'}">Sign in</button><button data-ax="up" class="${up ? 'on' : ''}">Create account</button></div>
<label>Email<input id="em" type="email" autocomplete="email" inputmode="email" value="${esc(em)}"></label>
<label>Password<span class="pwl"><input id="pw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}"><button type="button" data-ax="pwt" aria-label="Show password">👁</button></span></label>
${up ? '<div class="pws"><i id="pwb"></i></div><small id="pwh">Use 8+ characters. Longer is stronger.</small>' : ''}${gm(m)}
<button class="btn" data-ax="go" style="width:100%">${up ? 'Create account' : 'Sign in'}</button>
<p style="margin:14px 0 0"><a data-ax="fp">Forgot password?</a> · <a data-ax="about">About PropertyOS</a></p></div>`);
    const pw = $('#pw');
    const b = $('#pwb');
    if (b)
      pw.oninput = () => {
        const s = pwScore(pw.value);
        b.style.width = pw.value ? s * 25 + '%' : '0';
        b.style.background = ['var(--er)', 'var(--er)', 'var(--wr)', 'var(--ok)', 'var(--ok)'][s];
        $('#pwh').textContent = ['Too weak', 'Weak', 'Okay', 'Strong', 'Excellent'][s];
      };
    document.querySelectorAll('.ax input').forEach(i => i.onkeydown = e => {
      if (e.key == 'Enter')
        $('[data-ax=go]').click();
    });
    ($('#em').value ? pw : $('#em')).focus();
  }
  document.addEventListener('click', async (e) => {
    const l = e.target.closest('[data-lp]');
    if (l) {
      const k = l.dataset.lp;
      if (k == 'enq')
        return enquire(+l.dataset.i);
      ls('po-seen', '1');
      return authForm(k);
    }
    const a = e.target.closest('[data-ax]');
    if (!a)
      return;
    const k = a.dataset.ax;
    const em = $('#em') ? $('#em').value : '';
    if (k == 'in' || k == 'up') {
      ls('po-email', em.trim());
      return authForm(k);
    }
    if (k == 'about') {
      ls('po-seen', '');
      return landing();
    }
    if (k == 'pwt') {
      const p = $('#pw');
      p.type = p.type == 'password' ? 'text' : 'password';
      return;
    }
    if (k == 'out')
      return A.outNow();
    if (k == 'fp') {
      ls('po-email', em.trim());
      return auth('rs');
    }
    if (k == 'go') {
      const up = $('.ax .seg .on').dataset.ax == 'up';
      ls('po-seen', '1');
      ls('po-email', em.trim());
      a.disabled = true;
      const t = a.textContent;
      a.textContent = 'Please wait…';
      try {
        await auth(up ? 'up' : 'in');
      }
      finally {
        if (document.contains(a)) {
          a.disabled = false;
          a.textContent = t;
        }
      }
    }
  });
  function farewell() {
    $('#gate').classList.remove('lp');
    gate(`<div class="g gc ax">${LOGO}<h1>You’re signed out</h1><p class="m">Your data is safe and synced. See you soon 👋</p><button class="btn" data-lp="in" style="width:100%">Sign back in</button><div class="ac" style="margin-top:10px">${instEv || ios ? '<button class="btn q" data-a="inst">Install app</button>' : ''}<button class="btn q" data-ax="about">About</button></div></div>`);
  }
  authScreen = (m = '') => {
    if (bye) {
      bye = 0;
      return farewell();
    }
    if (!ls('po-seen') && !inv() && !m)
      return landing();
    authForm(inv() ? 'up' : 'in', m);
  };
  onboard = (m = '') => {
    gate(`<div class="g gc ax">${LOGO}<h1>Name your workspace</h1><p class="m">Properties, tenants and rent live here. You can rename it later.</p><label>Business name<input id="on" placeholder="e.g. Sharma Properties" autocomplete="organization"></label><label>Web address<input id="os" placeholder="sharma-properties"></label>${gm(m)}<button class="btn" style="width:100%" data-a="mkOrg">Create workspace</button><p style="margin:14px 0 0;font-size:13px;color:var(--mu)">Invited by someone? Open your invite link while signed in.</p><p><a data-ax="out">Sign out</a></p></div>`);
    const o = $('#os');
    o.oninput = () => o.dataset.t = 1;
    $('#on').oninput = e => {
      if (!o.dataset.t)
        o.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    };
    $('#on').focus();
  };
  /* ---------- Journey: skeleton on load, setup checklist, tenant quick pay ---------- */
  const _st = start;
  start = function () {
    const e = $('#gate');
    e && e.classList.remove('lp');
    if (S && !window._hyd)
      gate(`<div class="skl">${LOGO}<i style="width:70%"></i><i></i><i style="width:55%"></i></div>`);
    return _st.apply(this, arguments);
  };
  const steps = () => [['Add a property', D.props.length > 0, () => go('props')], ['Add a unit', D.units.length > 0, () => go('props')], ['Add a tenant', D.tenants.length > 0, () => go('tenants')], ['Create a lease', D.leases.length > 0, () => go('leases')], ['Set your UPI ID', !!myUpi(), () => A.upi()], ['Generate this month’s rent', D.charges.length > 0, () => A.genRent()]];
  A.clgo = e => {
    const s = steps().filter(x => !x[1])[0];
    s && s[2]();
  };
  A.cldis = () => {
    ls('po-cl-' + ORG, '1');
    render();
  };
  const _home = V.home;
  V.home = () => {
    let h = _home();
    let add = '';
    if (mgr()) {
      if (!ls('po-cl-' + ORG)) {
        const s = steps();
        const n = s.filter(x => x[1]).length;
        if (n < s.length)
          add = `<div class="g cl"><div class="hd"><div><b style="font-size:17px">Set up your workspace</b><br><small ${mu}>${n} of ${s.length} done</small></div><button class="btn s q" data-a="cldis">Hide</button></div><div class="bar"><i style="width:${n / s.length * 100}%"></i></div>${s.map(x => `<div class="it ${x[1] ? 'ok' : ''}"><em>${x[1] ? '✓' : ''}</em><b>${x[0]}</b></div>`).join('')}<button class="btn" data-a="clgo" style="width:100%;margin-top:8px">Continue setup</button></div>`;
      }
    }
    else {
      const c = safe(() => CHS().filter(x => bal(x) > 0).sort((a, b) => a.due.localeCompare(b.due))[0]);
      if (c && myUpi())
        add = `<div class="g cl" style="text-align:center"><b style="font-size:17px">${inr(bal(c))} due · ${MF(c.m)}</b><br><small ${mu}>${c.due < TD ? 'Overdue since ' + c.due : 'Due ' + c.due}</small><button class="btn" data-a="payqr" data-i="${c.id}" style="width:100%;margin-top:12px">Pay by UPI</button></div>`;
    }
    if (!add)
      return h;
    const j = h.indexOf('<h2');
    return j > 0 ? h.slice(0, j) + add + h.slice(j) : h + add;
  };
  /* ---------- Exit: before-you-go, sign out, unsaved guard ---------- */
  A.outNow = () => {
    bye = 1;
    ls('po-seen', '1');
    sb.auth.signOut();
  };
  A.outBak = () => {
    safe(() => A.bak());
    setTimeout(A.outNow, 500);
  };
  A.out = () => {
    if (!mgr())
      return modal(`<h3>Sign out?</h3><p ${mu}>You can sign back in any time.</p><div class="ac"><button class="btn q" data-x>Stay</button><button class="btn d" data-a="outNow" data-x>Sign out</button></div>`);
    const cc = D.charges.filter(c => c.m == CM);
    const col = cc.reduce((s, c) => s + paid(c), 0);
    const od = D.charges.filter(c => st(c) == 'Overdue').length;
    const nq = D.inq.filter(q => q.st == 'New').length;
    modal(`<h3>Before you go</h3><p ${mu} style="margin:0">Here’s where things stand in ${MF(CM)}.</p><div class="xs"><div><b>${inr(col)}</b><small>COLLECTED</small></div><div><b>${od}</b><small>OVERDUE</small></div><div><b>${nq}</b><small>NEW INQUIRIES</small></div></div><div class="ac4"><button class="btn q" data-a="outBak" data-x>Backup &amp; sign out</button><button class="btn d" data-a="outNow" data-x>Sign out</button></div><button class="btn" data-x style="width:100%">Stay signed in</button>`);
  };
  addEventListener('beforeunload', e => {
    if ([...document.querySelectorAll('.ov form input,.ov form textarea')].some(i => i.value !== i.defaultValue)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  if (document.body.classList.contains('ready'))
    safe(render);
})();
