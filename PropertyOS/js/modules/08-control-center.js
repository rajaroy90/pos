/* PropertyOS module 8: ColorOS 17 style liquid glass. Control center, notification stack, luminous dashboard,
   glass switches, quick create, banner toasts. Loads last. No new services or assets (free-tier safe). */
(() => {
  const safe = f => {
    try {
      return f();
    }
    catch (e) {
      return null;
    }
  };
  const Q = s => document.querySelector(s);
  const html = document.documentElement;
  const DAY = 864e5;
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d.split('M').filter(Boolean).map(x => '<path d="M' + x + '"/>').join('') + '</svg>';
  const IC = {
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', plus: 'M12 5v14M5 12h14',
    wifi: 'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01',
    rupee: 'M6 3h12M6 8h12M6 13l8.5 8M6 13h3M9 13c6.667 0 6.667-10 0-10',
    volume: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14',
    phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM2 8v8M22 8v8',
    bellOff: 'M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22',
    bolt: 'M13 2L3 14h9l-1 8 10-12h-9z', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    wave: 'M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', chev: 'M6 9l6 6 6-6'
  };
  /* ---------- State (device only) ---------- */
  const CCK = 'po-cc8';
  const DIS = 'po-dis8';
  const CS = Object.assign({
    gw: 100, mo: 50, hap: 1, hide: 0
  }, safe(() => JSON.parse(ls(CCK) || '{}')) || {});
  const store = () => ls(CCK, JSON.stringify(CS));
  const snd = () => ls('po-snd') !== '0';
  const lp = ls('po-lite');
  const applyCS = () => {
    html.style.setProperty('--gw', (.25 + CS.gw * .0075).toFixed(3));
    html.style.setProperty('--md', (12 + (100 - CS.mo) * .2).toFixed(1) + 's');
    html.classList.toggle('still8', CS.mo == 0);
    html.classList.toggle('hide8', !!CS.hide);
  };
  applyCS();
  if (lp === '1')
    html.classList.add('lite');
  else if (lp === '0')
    html.classList.remove('lite');
  safe(() => {
    const v = navigator.vibrate && navigator.vibrate.bind(navigator);
    v && Object.defineProperty(navigator, 'vibrate', {
      value: p => CS.hap ? v(p) : false, configurable: true
    });
  });
  /* ---------- CSS ---------- */
  const css = document.createElement('style');
  css.id = 'po-m8';
  css.textContent = `
h2 {
  text-transform: none;
  letter-spacing: -.01em;
  font-size: 17px;
  font-weight: 700;
  color: var(--tx);
  margin: 26px 4px 12px;
}

.bl {
  opacity: var(--gw,1);
}

.bl i {
  animation-duration: var(--md,22s);
}

.still8 .bl i {
  animation-play-state: paused;
}

.hide8 .k b,
.hide8 .lum b {
  filter: blur(9px);
}

.lens {
  background: linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,0) 62%), var(--fl);
  box-shadow: inset 0 1px 1px rgba(255,255,255,.85), inset 0 -3px 8px rgba(255,255,255,.18), 0 6px 18px var(--sh);
}

.hb8 {
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0!important;
  display: grid;
  place-items: center;
}

.bg8 {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 99px;
  background: #ff3b30;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 19px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg), 0 4px 10px rgba(255,59,48,.5);
}

.bg8[hidden],
.fab8[hidden] {
  display: none!important;
}

@media(max-width:699px) {
  #rl {
  display: none;
  }
}

.ts {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px 10px 12px;
  max-width: min(460px,calc(100% - 28px));
  font-size: 14px;
  line-height: 1.3;
}

.ts::before {
  content: '\\2713';
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(145deg,#5be584,var(--ok));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.6);
}

.ts[data-k=err]::before {
  content: '!';
  background: linear-gradient(145deg,#ff8a80,var(--er));
}

.sw {
  position: relative;
  flex: none;
  width: 58px;
  height: 34px;
  padding: 0;
  border-radius: 99px;
  border: 1px solid var(--gb);
  background: rgba(120,130,170,.32);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.18);
  cursor: pointer;
  transition: background .35s;
}

.sw i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 38px;
  height: 28px;
  border-radius: 99px;
  background: linear-gradient(180deg,#fff,#eef1ff);
  box-shadow: inset 0 1px 0 #fff, 0 3px 10px rgba(0,0,0,.28);
  transition: transform .45s cubic-bezier(.3,1.4,.45,1), width .25s;
}

.sw[aria-checked=true] {
  background: var(--ok);
}

.sw[aria-checked=true] i {
  transform: translateX(16px);
}

.sw:active i {
  width: 46px;
}

.sw[aria-checked=true]:active i {
  transform: translateX(8px);
}

.tgl8 {
  padding: 4px 16px;
}

.tg8 {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--gb);
}

.tg8:last-child {
  border: 0;
}

.tg8 .m {
  flex: 1;
  min-width: 0;
}

.tg8 b {
  display: block;
  font-size: 15px;
}

.tg8 small {
  color: var(--mu);
  font-size: 12.5px;
}

.dc8 {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg,#fff,#e8ecff);
  color: var(--ac);
  box-shadow: inset 0 1px 0 #fff, 0 4px 12px rgba(0,0,0,.16);
}

.dc8 svg {
  width: 22px;
  height: 22px;
}

.d8 {
  display: grid;
  grid-template-columns: 1fr 70px 70px;
  gap: 12px;
  margin-bottom: 6px;
}

.lum {
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.lum small {
  color: var(--mu);
  font-weight: 600;
}

.lum b {
  display: block;
  font-size: clamp(26px,7vw,40px);
  letter-spacing: -.03em;
  line-height: 1.05;
  margin-top: 4px;
}

.lum>span {
  font-size: 13px;
  color: var(--mu);
}

.lb8 {
  position: relative;
  height: 16px;
  border-radius: 99px;
  margin: 18px 0 16px;
  background: rgba(120,130,170,.22);
  box-shadow: inset 0 1px 3px rgba(0,0,0,.18), 0 0 0 1px var(--gb);
}

.lb8 u {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  min-width: 0;
  text-decoration: none;
  border-radius: 99px;
  background: linear-gradient(90deg,rgba(255,196,60,0),#ffc43c 45%,#fff);
  box-shadow: 0 0 22px 2px rgba(255,190,70,.5);
  transition: width 1.4s cubic-bezier(.2,.9,.3,1) .25s;
}
.lb8 u.empty {
  min-width: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}
.lb8 u.empty::before,
.lb8 u.empty::after {
  display: none !important;
}
.lb8 u:not(.empty) {
  min-width: 16px;
}

.lb8 u::before {
  content: '';
  position: absolute;
  right: 8px;
  top: -22px;
  bottom: -22px;
  width: 120px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 100% 50%,rgba(255,200,90,.5),transparent 70%);
  pointer-events: none;
}

.lb8 u::after {
  content: '';
  position: absolute;
  right: 0;
  top: -3px;
  bottom: -3px;
  width: 24px;
  border-radius: 99px;
  background: #fff;
  box-shadow: 0 0 14px 3px rgba(255,255,255,.9), 0 0 28px 8px rgba(255,200,90,.55);
}

/* —— Hero tail-light progress (music-player glow tip) —— */
.hero-tail {
  flex: 1 1 100%;
  width: 100%;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hero-tail-track {
  position: relative;
  height: 10px;
  border-radius: 99px;
  background: rgba(120,130,170,.22);
  box-shadow: inset 0 1px 3px rgba(0,0,0,.2), 0 0 0 1px var(--gb);
  overflow: visible;
}
.hero-tail-track u {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  min-width: 0;
  text-decoration: none;
  border-radius: 99px;
  background: linear-gradient(90deg, rgba(255,196,60,0), #ffc43c 42%, #fff 100%);
  box-shadow: 0 0 20px 2px rgba(255,190,70,.55);
  transition: width 1.35s cubic-bezier(.2,.9,.3,1) .2s;
}
.hero-tail-track u:not(.empty) {
  min-width: 14px;
}
.hero-tail-track u.empty {
  min-width: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}
.hero-tail-track u.empty::before,
.hero-tail-track u.empty::after {
  display: none !important;
}
.hero-tail-track u::before {
  content: '';
  position: absolute;
  right: 4px;
  top: -20px;
  bottom: -20px;
  width: 100px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 100% 50%, rgba(255,200,90,.55), transparent 70%);
  pointer-events: none;
}
.hero-tail-track u::after {
  content: '';
  position: absolute;
  right: -2px;
  top: -4px;
  bottom: -4px;
  width: 22px;
  border-radius: 99px;
  background: #fff;
  box-shadow:
    0 0 12px 3px rgba(255,255,255,.95),
    0 0 26px 8px rgba(255,200,90,.6),
    0 0 40px 12px rgba(255,180,60,.25);
}
.hero-tail-meta {
  font-size: 12px;
  color: var(--mu);
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.hero-tail-meta b {
  font-size: 14px;
  color: var(--tx);
  font-variant-numeric: tabular-nums;
}

.chs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ch8 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--fl);
  border: 1px solid var(--gb);
  font-size: 12px;
  padding: 7px 11px;
}

.ch8 i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ch8 svg {
  width: 15px;
  height: 15px;
}

.vw {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 200px;
}

.vw .vs8 {
  flex: 1;
}

.vw small {
  text-align: center;
  font-size: 11px;
  color: var(--mu);
  line-height: 1.25;
}

.vw small b {
  display: block;
  font-size: 14px;
  color: var(--tx);
}

.vs8 {
  position: relative;
  border-radius: 99px;
  overflow: hidden;
  background: var(--gl);
  border: 1px solid var(--gb);
  box-shadow: inset 0 1.5px 0 var(--fl), 0 10px 30px var(--sh);
  touch-action: none;
}

.vs8.ix {
  cursor: ns-resize;
}

.vs8 s {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0;
  text-decoration: none;
  background: linear-gradient(180deg,#fff,#e4e8ff);
  transition: height 1s cubic-bezier(.2,.9,.3,1) .2s;
}

.vs8.drag s {
  transition: none;
}

.vs8 svg {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: 26px;
  height: 26px;
  color: #f5a000;
}

.fab8 {
  position: fixed;
  right: 16px;
  bottom: calc(92px + env(safe-area-inset-bottom,0px));
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  z-index: 6;
  border: 0;
  color: var(--tx);
  cursor: pointer;
  transition: transform .45s cubic-bezier(.3,1.5,.45,1);
}

.fab8 svg {
  width: 26px;
  height: 26px;
  transition: transform .4s cubic-bezier(.3,1.5,.45,1);
}

.fab8[aria-expanded=true] svg {
  transform: rotate(135deg);
}

.fab8:active {
  transform: scale(.92);
}

.qa8 {
  position: fixed;
  right: 16px;
  bottom: calc(160px + env(safe-area-inset-bottom,0px));
  z-index: 6;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}

.qa8 button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 99px;
  padding: 10px 18px 10px 12px;
  color: var(--tx);
  font-family: inherit;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(16px) scale(.9);
  transition: opacity .3s, transform .5s cubic-bezier(.3,1.5,.45,1);
}

.qa8 svg {
  width: 20px;
  height: 20px;
}

.qa8.on button {
  opacity: 1;
  transform: none;
  pointer-events: auto;
  transition-delay: calc(var(--n)*40ms);
}

@media(min-width:900px) {
  .fab8 {
  bottom: 28px;
  right: 28px;
  }
  .qa8 {
  bottom: 96px;
  right: 28px;
  }
}

body:not(.ready) .fab8,
body:not(.ready) .qa8 {
  display: none;
}

.ov.cc8 {
  align-items: flex-start;
  overflow: auto;
  padding: max(18px,env(safe-area-inset-top)) 14px calc(28px + env(safe-area-inset-bottom));
  background: color-mix(in srgb,var(--bg) 58%,transparent);
  backdrop-filter: blur(26px) saturate(1.6);
  -webkit-backdrop-filter: blur(26px) saturate(1.6);
}

.ccw {
  width: min(420px,100%);
  margin: auto;
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 12px;
}

.ccw>* {
  animation: up .6s cubic-bezier(.2,.9,.3,1) both;
  animation-delay: calc(var(--i,0)*45ms);
}

.t8 {
  border-radius: 34px;
  color: var(--tx);
  font-family: inherit;
}

.pt8 {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border-radius: 99px;
  min-width: 0;
  text-align: left;
  font-size: inherit;
  cursor: pointer;
}

.pt8 .m {
  min-width: 0;
}

.pt8 b,
.pt8 small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pt8 small {
  color: var(--mu);
  font-size: 12px;
}

.mc8 {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 214px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mc8 .big {
  font-size: 28px;
  letter-spacing: -.03em;
  line-height: 1.1;
  display: block;
}

.mc8 small {
  color: var(--mu);
}

.mc8 .lb8 {
  margin: 16px 0 12px;
}

.ccw .vw {
  grid-row: span 2;
  min-height: 0;
}

.ds8 {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 0;
  cursor: pointer;
  border-radius: 50%;
  position: relative;
  font-weight: 800;
  font-size: 13px;
}

.ds8 svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
}

.ds8 em {
  font-style: normal;
  color: var(--tx);
}

.ds8>svg:only-child {
  padding: 0;
}

.sg8 {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 99px;
}

.sg8 button {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: none;
  color: var(--mu);
  cursor: pointer;
  transition: background .3s, color .3s, transform .4s cubic-bezier(.3,1.5,.45,1);
}

.sg8 svg {
  width: 22px;
  height: 22px;
}

.sg8 button[aria-pressed=true] {
  background: #fff;
  color: var(--ac);
  box-shadow: 0 4px 14px rgba(0,0,0,.2);
  transform: scale(1.06);
}

.sg8 button:last-child[aria-pressed=true] {
  color: #ff453a;
}

.ccw .tgl8,
.qk8,
.so8 {
  grid-column: 1/-1;
}

.qk8 {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(70px,1fr));
  gap: 12px;
}

.qb8 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px;
  border: 0;
  border-radius: 26px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.qb8 svg {
  width: 24px;
  height: 24px;
}

.ov.nc8 {
  align-items: flex-start!important;
  background: color-mix(in srgb,var(--bg) 40%,transparent);
}

.nc8 .sh {
  width: min(540px,100%);
  border-radius: 0 0 36px 36px;
  padding-top: calc(18px + env(safe-area-inset-top,0px));
  animation: dn .55s cubic-bezier(.2,1.1,.3,1);
}

@keyframes dn {
  from {
  transform: translateY(-100%);
  }
}

.nh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.nh h3 {
  margin: 0!important;
}

.nt {
  position: relative;
  margin-bottom: 10px;
  border-radius: 26px;
}

.nb {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  background: none;
  color: var(--tx);
  font-family: inherit;
  font-size: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 26px;
}

.nb .m {
  flex: 1;
  min-width: 0;
}

.nb b,
.nb small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nb b {
  font-size: 15px;
}

.nb small {
  color: var(--mu);
  font-size: 13px;
}

.nb time {
  align-self: flex-start;
  padding-top: 2px;
  color: var(--mu);
  font-size: 13px;
}

.nb>svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--mu);
  transition: transform .35s cubic-bezier(.3,1.5,.45,1);
}

.nt.open .nb>svg {
  transform: rotate(180deg);
}

.nt .na {
  display: none;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 14px 14px 70px;
}

.nt.open .na {
  display: flex;
}

.nt.edge::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: -8px;
  height: 14px;
  border-radius: 0 0 22px 22px;
  background: var(--gl);
  border: 1px solid var(--gb);
  border-top: 0;
  z-index: -1;
}
`;
  document.head.append(css);
  /* ---------- Switches ---------- */
  const SW = {
    snd: ['Sound effects', 'Taps, success and error tones', 'volume', snd, () => A.snd && A.snd()],
    hap: ['Haptics', 'Light vibration on taps', 'phone', () => !!CS.hap, () => {
        CS.hap = CS.hap ? 0 : 1;
        store();
      }],
    lite: ['Low-power glass', 'Lighter blur and a calmer background', 'bolt', () => html.classList.contains('lite'), () => {
        const n = !html.classList.contains('lite');
        html.classList.toggle('lite', n);
        ls('po-lite', n ? '1' : '0');
      }],
    hide: ['Hide amounts', 'Blur rent figures on screen', 'eye', () => !!CS.hide, () => {
        CS.hide = CS.hide ? 0 : 1;
        store();
        applyCS();
      }]
  };
  const tg = k => {
    const s = SW[k];
    return `<div class="tg8"><span class="dc8">${ic(IC[s[2]])}</span><div class="m"><b>${s[0]}</b><small>${s[1]}</small></div><button class="sw" role="switch" aria-checked="${!!s[3]()}" aria-label="${s[0]}" data-sw="${k}"><i></i></button></div>`;
  };
  const mode = () => snd() ? 'sound' : CS.hap ? 'haptic' : 'silent';
  const sync = () => {
    document.querySelectorAll('[data-sw]').forEach(b => b.setAttribute('aria-checked', !!SW[b.dataset.sw][3]()));
    document.querySelectorAll('.sg8 button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k8.split(':')[1] == mode()));
  };
  const _s = V.set;
  V.set = () => _s() + `<h2>Preferences</h2><div class="g tgl8">${Object.keys(SW).map(tg).join('')}</div>`;
  /* ---------- Helpers ---------- */
  const fill = r => requestAnimationFrame(() => requestAnimationFrame(() => {
    r.querySelectorAll('[data-h]').forEach(s => s.style.height = s.dataset.h + '%');
    r.querySelectorAll('[data-w]').forEach(u => { const w = +u.dataset.w || 0; u.style.width = w + '%'; u.classList.toggle('empty', w <= 0); });
  }));
  const lum = p => `<div class="lb8" role="img" aria-label="${p}% collected"><u data-w="${p}"></u></div>`;
  const vs = (k, l, i, v, x) => `<div class="vw"><div class="vs8${x ? ' ix' : ''}"${x ? ` tabindex="0" role="slider" aria-label="${l}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" data-s="${k}"` : ` role="img" aria-label="${l} ${v}%"`}><s data-h="${v}"></s>${ic(i)}</div><small><b>${v}%</b>${l}</small></div>`;
  function slider(el) {
    const k = el.dataset.s;
    const set = v => {
      v = Math.max(0, Math.min(100, Math.round(v)));
      CS[k] = v;
      applyCS();
      el.firstElementChild.style.height = v + '%';
      el.setAttribute('aria-valuenow', v);
      el.parentNode.querySelector('b').textContent = v + '%';
    };
    const pos = e => {
      const r = el.getBoundingClientRect();
      set((1 - (e.clientY - r.top) / r.height) * 100);
    };
    el.onpointerdown = e => {
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      pos(e);
      el.onpointermove = pos;
    };
    el.onpointerup = el.onpointercancel = () => {
      el.onpointermove = null;
      el.classList.remove('drag');
      store();
    };
    el.onkeydown = e => {
      const d = {
        ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5
      }[e.key];
      if (d) {
        e.preventDefault();
        set(CS[k] + d);
        store();
      }
    };
  }
  const ovc = o => o.addEventListener('click', e => {
    if (e.target == o || e.target.classList.contains('ccw') || e.target.dataset.x != null)
      return o.remove();
    if (e.target.closest('[data-a],[data-k8^="f:"],[data-k8="out"]'))
      o.remove();
  });
  /* ---------- Dashboard (manager home) ---------- */
  function dash() {
    if (view != 'home' || !mgr() || Q('#v .d8'))
      return;
    const h = Q('#v .hero');
    if (!h)
      return;
    const us = D.units;
    const oc = us.length ? Math.round(us.filter(active).length / us.length * 100) : 0;
    const cc = D.charges.filter(c => c.m == CM);
    const bill = cc.reduce((s, c) => s + c.amt, 0);
    const col = cc.reduce((s, c) => s + paid(c), 0);
    const pc = bill ? Math.min(100, Math.round(col / bill * 100)) : 0;
    const n = f => cc.filter(c => f(st(c))).length;
    const od = D.charges.filter(c => st(c) == 'Overdue').length;
    const billNote = bill
      ? `of ${inr(bill)} billed`
      : (D.charges.some(c => st(c) !== 'Paid')
        ? 'Generate this month’s rent to track collection'
        : 'No charges this month yet');
    /* Tail-light progress inside hero (music-player style glow tip) */
    if (!h.querySelector('.hero-tail')) {
      h.insertAdjacentHTML('beforeend',
        `<div class="hero-tail" role="img" aria-label="${pc}% collected this month">
          <div class="hero-tail-track"><u data-w="${pc}"></u></div>
          <span class="hero-tail-meta"><b>${pc}%</b> collected · ${inr(col)}</span>
        </div>`);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const u = h.querySelector('.hero-tail-track u');
        if (u) {
          const w = +u.dataset.w || 0;
          u.style.width = w + '%';
          if (w <= 0) u.classList.add('empty');
        }
      }));
    }
    h.insertAdjacentHTML('afterend', `<section class="d8" style="--i:2"><div class="g lum"><div><small>Collected in ${MF(CM)}</small><b>${inr(col)}</b><span>${billNote}</span></div>${lum(pc)}<div class="chs"><button class="pill ch8" data-k8="f:Paid"><i style="background:var(--ok)"></i>${n(s => s == 'Paid')} paid</button><button class="pill ch8" data-k8="f:Due"><i style="background:var(--ac)"></i>${n(s => s == 'Due' || s == 'Partial')} due</button><button class="pill ch8" data-k8="f:Overdue"><i style="background:var(--er)"></i>${od} overdue</button></div></div>${vs('o', 'Occupied', IC.sun.slice(0, 0) || 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', oc)}${vs('c', 'Collected', IC.rupee, pc)}</section>`);
    fill(Q('#v .d8'));
  }
  /* ---------- Notifications ---------- */
  function notes() {
    const o = [];
    const m = mgr();
    const nm = c => {
      const i = info(g('leases', c.lid));
      return m ? i.t.name + ' · ' + i.u.name : 'Rent for ' + MF(c.m);
    };
    CHS().forEach(c => safe(() => {
      if (st(c) == 'Paid')
        return;
      const pay = m ? [['Record payment', 'payNow', c.id]] : [['Pay by UPI', 'payqr', c.id]];
      if (st(c) == 'Overdue') {
        const n = Math.max(1, Math.floor((T - new Date(c.due)) / DAY));
        o.push({
          k: 'od' + c.id, p: 0, c: '#ff3b30', ic: 'pay', t: nm(c), s: inr(bal(c)) + ' overdue', w: n + 'd late', a: m ? [['Remind', 'remind', c.id], ...pay] : pay
        });
      }
      else {
        const n = Math.ceil((new Date(c.due) - T) / DAY);
        if (n <= 3)
          o.push({
            k: 'du' + c.id, p: 2, c: '#0a84ff', ic: 'pay', t: nm(c), s: inr(bal(c)) + (n <= 0 ? ' due today' : ' due in ' + n + (n == 1 ? ' day' : ' days')), w: n <= 0 ? 'today' : 'in ' + n + 'd', a: pay
          });
      }
    }));
    if (m) {
      D.leases.filter(l => l.st == 'active' && l.end >= TD && (new Date(l.end) - T) / DAY <= 45).forEach(l => safe(() => {
        const i = info(l);
        const n = Math.max(0, Math.ceil((new Date(l.end) - T) / DAY));
        o.push({
          k: 'ls' + l.id, p: 3, c: '#af52de', ic: 'leases', t: i.t.name + ' · ' + i.u.name, s: 'Lease ends in ' + n + (n == 1 ? ' day' : ' days'), w: n + 'd', a: [['Open leases', 'nav', '', 'leases']]
        });
      }));
      D.inq.filter(q => q.st == 'New').forEach(q => o.push({
        k: 'in' + q.id, p: 1, c: '#ff2d55', ic: 'inq', t: q.name, s: q.msg || 'New inquiry', w: 'New', a: [['Open', 'nav', '', 'inq'], ['Mark contacted', 'cycQ', q.id]]
      }));
    }
    MT().filter(x => x.st == 'Open').forEach(x => safe(() => {
      const u = g('units', x.uid);
      o.push({
        k: 'mt' + x.id, p: x.pr == 'High' ? 1 : 2, c: '#ff9500', ic: 'maint', t: x.title, s: u ? g('props', u.pid).name + ' · ' + u.name : 'Repair request', w: x.pr || 'Open', a: [['Open', 'nav', '', 'maint']]
      });
    }));
    return o.sort((a, b) => a.p - b.p);
  }
  const dis = () => new Set(safe(() => JSON.parse(ls(DIS) || '[]')) || []);
  const live = () => notes().filter(n => !dis().has(n.k));
  const hide = ks => {
    const cur = new Set(notes().map(n => n.k));
    ls(DIS, JSON.stringify([...new Set([...dis(), ...ks])].filter(k => cur.has(k))));
  };
  function badge() {
    const b = Q('#bell8 .bg8');
    if (!b)
      return;
    const n = safe(() => live().length) || 0;
    b.hidden = !n;
    b.textContent = n > 9 ? '9+' : n;
  }
  const card = (n, e) => `<div class="g nt${e ? ' edge' : ''}"><button class="nb" aria-expanded="false">${ico(n.ic, n.c)}<span class="m"><b>${esc(n.t)}</b><small>${esc(n.s)}</small></span><time>${esc(n.w)}</time>${ic(IC.chev)}</button><div class="na">${n.a.map(([l, a, i, v]) => `<button class="pill ch8" data-a="${a}" data-i="${esc(i || '')}" data-v="${v || ''}">${l}</button>`).join('')}<button class="pill ch8" data-k8="dis:${esc(n.k)}">Dismiss</button></div></div>`;
  function ncPaint(o) {
    const L = live();
    const all = o.dataset.all == '1';
    const sh = all ? L : L.slice(0, 4);
    const r = L.length - sh.length;
    o.firstChild.innerHTML = `<div class="nh"><h3>Notifications</h3>${L.length ? '<button class="pill ch8" data-k8="clr">Clear all</button>' : ''}</div>` + (L.length ? sh.map((n, i) => card(n, r > 0 && i == sh.length - 1)).join('') + (r > 0 ? `<button class="btn q" style="width:100%;margin-top:6px" data-k8="more">Show ${r} more</button>` : '') : '<div class="em">You’re all caught up.<br><button class="pill ch8" data-k8="rst" style="margin-top:12px">Show cleared</button></div>');
    badge();
  }
  function nc() {
    if (Q('.nc8'))
      return;
    const o = document.createElement('div');
    o.className = 'ov nc8';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'Notifications');
    o.innerHTML = '<div class="sh g"></div>';
    ovc(o);
    o.addEventListener('click', e => {
      const b = e.target.closest('.nb');
      if (b) {
        const c = b.parentNode.classList.toggle('open');
        b.setAttribute('aria-expanded', c);
      }
    });
    ncPaint(o);
    document.body.append(o);
  }
  /* ---------- Control center ---------- */
  function cc() {
    if (Q('.cc8'))
      return;
    const m = mgr();
    const cs = CHS().filter(c => c.m == CM);
    const bill = cs.reduce((s, c) => s + c.amt, 0);
    const col = cs.reduce((s, c) => s + paid(c), 0);
    const pc = bill ? Math.min(100, Math.round(col / bill * 100)) : 0;
    const upi = D.upi || ls('po-upi-' + ORG);
    const on = navigator.onLine;
    const qk = [...(m ? [['scan', I('qr'), 'Scan QR'], ['bak', ic(IC.out.slice(0, 0)) || I('set'), 'Backup']] : []), ['look', ic(IC.sliders), 'Appearance'], ...(m ? [['nav', I('set'), 'Settings']] : [])];
    const ring = `<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="22" stroke="rgba(120,130,170,.3)" stroke-width="5"/><circle cx="28" cy="28" r="22" stroke="var(--ok)" stroke-width="5" stroke-dasharray="${(pc * 1.382).toFixed(1)} 138.2" transform="rotate(-90 28 28)"/></svg>`;
    const o = document.createElement('div');
    o.className = 'ov cc8';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'Control center');
    o.innerHTML = `<div class="ccw"><div class="g t8 pt8"><span class="dc8" style="${on ? '' : 'color:#8e8e93'}">${ic(IC.wifi)}</span><span class="m"><b>${esc(D.org)}</b><small>${on ? 'Synced' : 'Offline, changes wait'}</small></span></div>
${m ? `<button class="g t8 pt8" data-a="upi"><span class="dc8">${ic(IC.rupee)}</span><span class="m"><b>UPI rent QR</b><small>${upi ? esc(upi) : 'Add your UPI ID'}</small></span></button>` : `<div class="g t8 pt8"><span class="dc8">${I('tenants')}</span><span class="m"><b>Tenant</b><small>${esc(S.user.email)}</small></span></div>`}
<div class="g t8 mc8"><div style="display:flex;justify-content:space-between;align-items:center"><span class="dc8">${ic(IC.rupee)}</span><small>${MF(CM)}</small></div><div><b class="big">${inr(m ? col : cs.reduce((s, c) => s + bal(c), 0))}</b><small>${m ? 'of ' + inr(bill) + ' · ' + pc + '%' : 'rent due this month'}</small>${lum(m ? pc : bill ? Math.round((bill - cs.reduce((s, c) => s + bal(c), 0)) / bill * 100) : 0)}</div>
<div class="chs"><button class="pill ch8" data-k8="f:Overdue">Overdue</button>${m ? '<button class="pill ch8" data-a="genRent">Generate rent</button>' : '<button class="pill ch8" data-a="nav" data-v="pay">Pay rent</button>'}</div></div>
${vs('gw', 'Glow', IC.sun, CS.gw, 1)}${vs('mo', 'Motion', IC.wave, CS.mo, 1)}
<button class="g t8 ds8" data-a="nav" data-v="pay" aria-label="Rent collected ${pc}%">${ring}<em>${pc}%</em></button>
<button class="g t8 ds8" ${m ? 'data-a="srch" aria-label="Search"' : 'data-a="look" aria-label="Appearance"'}>${m ? I('search') : ic(IC.sliders)}</button>
<div class="g t8 sg8" role="group" aria-label="Alert style"><button data-k8="m:sound" aria-label="Sound and haptics" aria-pressed="${mode() == 'sound'}">${ic(IC.bell)}</button><button data-k8="m:haptic" aria-label="Haptics only" aria-pressed="${mode() == 'haptic'}">${ic(IC.phone)}</button><button data-k8="m:silent" aria-label="Silent" aria-pressed="${mode() == 'silent'}">${ic(IC.bellOff)}</button></div>
<div class="g t8 tgl8">${Object.keys(SW).map(tg).join('')}</div>
<div class="qk8">${qk.map(([a, i, l]) => `<button class="g qb8 t8" data-a="${a}"${a == 'nav' ? ' data-v="set"' : ''}>${i}${l}</button>`).join('')}</div>
<button class="btn q so8" data-k8="out">${ic(IC.out).replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px;margin-right:6px"')}Sign out</button></div>`;
    ovc(o);
    [...o.firstChild.children].forEach((c, i) => c.style.setProperty('--i', i));
    document.body.append(o);
    o.querySelectorAll('.ix').forEach(slider);
    fill(o);
  }
  /* ---------- Header buttons, quick create ---------- */
  const QA = [['props', 'addProp', 'Property'], ['tenants', 'addTen', 'Tenant'], ['leases', 'addLease', 'Lease'], ['maint', 'addM', 'Repair request'], ['pay', 'genRent', 'Generate rent']];
  function ensure() {
    if (!Q('#bell8')) {
      const b = document.createElement('button');
      const c = document.createElement('button');
      b.id = 'bell8';
      b.className = 'pill g hb8';
      b.setAttribute('aria-label', 'Notifications');
      b.innerHTML = ic(IC.bell) + '<span class="bg8" hidden></span>';
      b.onclick = nc;
      c.className = 'pill g hb8';
      c.setAttribute('aria-label', 'Control center');
      c.innerHTML = ic(IC.sliders);
      c.onclick = cc;
      Q('#scbtn').before(b, c);
    }
    if (!Q('#fab8')) {
      const f = document.createElement('button');
      const q = document.createElement('div');
      f.id = 'fab8';
      f.className = 'fab8 g';
      f.setAttribute('aria-label', 'Quick create');
      f.setAttribute('aria-expanded', 'false');
      f.innerHTML = ic(IC.plus);
      q.className = 'qa8';
      q.innerHTML = QA.map(([k, a, l], i) => `<button class="g" data-a="${a}" style="--n:${i}">${I(k)}${l}</button>`).join('');
      f.onclick = () => {
        const on = !q.classList.contains('on');
        q.classList.toggle('on', on);
        f.setAttribute('aria-expanded', on);
      };
      document.body.append(f, q);
    }
    Q('#fab8').hidden = !mgr();
    badge();
  }
  const closeQ = () => {
    const q = Q('.qa8');
    const f = Q('#fab8');
    q && q.classList.remove('on');
    f && f.setAttribute('aria-expanded', 'false');
  };
  /* ---------- Events ---------- */
  document.addEventListener('click', e => {
    const w = e.target.closest('[data-sw]');
    if (w) {
      SW[w.dataset.sw][4]();
      sync();
      return;
    }
    if (!e.target.closest('#fab8'))
      closeQ();
    const k = e.target.closest('[data-k8]');
    if (!k)
      return;
    const [a, b] = k.dataset.k8.split(':');
    const o = Q('.nc8');
    if (a == 'f') {
      flt = b;
      go('pay');
    }
    else if (a == 'out')
      Q('#rl').click();
    else if (a == 'm') {
      if (snd() !== (b == 'sound') && A.snd)
        A.snd();
      CS.hap = b == 'silent' ? 0 : 1;
      store();
      sync();
    }
    else if (a == 'dis') {
      hide([b]);
      o && ncPaint(o);
    }
    else if (a == 'clr') {
      hide(notes().map(n => n.k));
      o && ncPaint(o);
    }
    else if (a == 'rst') {
      ls(DIS, '[]');
      o && ncPaint(o);
    }
    else if (a == 'more' && o) {
      o.dataset.all = '1';
      ncPaint(o);
    }
  });
  addEventListener('keydown', e => {
    if (e.key == 'Escape')
      closeQ();
  });
  addEventListener('online', () => safe(() => {
    const o = Q('.cc8');
    o && (o.remove(), cc());
  }));
  addEventListener('offline', () => safe(() => {
    const o = Q('.cc8');
    o && (o.remove(), cc());
  }));
  const _t = toast;
  toast = function (m) {
    _t.apply(this, arguments);
    const e = Q('#ts');
    e && (e.dataset.k = /fail|error|invalid|must|enter |first|not |cannot|could not|taken|wrong|went wrong/i.test(String(m || '')) ? 'err' : 'ok');
  };
  const _r = render;
  render = function () {
    const r = _r.apply(this, arguments);
    safe(ensure);
    safe(dash);
    const o = Q('.nc8');
    o && safe(() => ncPaint(o));
    return r;
  };
  if (window.D && Q('body.ready'))
    safe(() => {
      ensure();
      dash();
    });
})();
