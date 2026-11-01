import { svgFrom } from './h.js';

// 24x24 line icons, drawn for this project.
const P = {
  rent: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M16 15h2"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  up: '<path d="M5 15l7-7 7 7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  upi: '<path d="M7 5l4 14M13 5l4 14M4 12h16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  alert: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  spray: '<path d="M9 9h6v12H9zM10 9V6h4v3M14 4h3M18 3l2-1M18 6l2 1"/>',
  bug: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8V4M8 11L4 9M16 11l4-2M7.5 15H3M16.5 15H21M8.5 19L5 22M15.5 19l3.5 3M9 6l-2-3M15 6l2-3"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  wall: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6"/>',
};

export function icon(name, size = 22, cls = '') {
  const body = P[name];
  if (!body) throw new Error(`icon "${name}" missing`);
  const el = svgFrom(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`,
  );
  if (cls) el.setAttribute('class', cls);
  return el;
}

/** Glossy "soft 3D" hero artwork used in widgets, inspired by the reference tile. Static markup only. */
const HERO = {
  coin: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="hc1" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff4b8"/><stop offset=".45" stop-color="#ffc83d"/><stop offset="1" stop-color="#e58a1f"/></radialGradient>
    <linearGradient id="hc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="48" cy="84" rx="26" ry="5" fill="#0a2a52" opacity=".28"/>
    <circle cx="48" cy="46" r="34" fill="url(#hc1)"/><circle cx="48" cy="46" r="27" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2"/>
    <path d="M36 32h24M36 40h24M42 32c10 0 14 4 14 8s-5 8-14 8l14 14" fill="none" stroke="#9a5300" stroke-opacity=".8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="38" cy="26" rx="18" ry="9" fill="url(#hc2)" transform="rotate(-24 38 26)"/></svg>`,
  wrench: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="hw1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f8fc"/><stop offset=".5" stop-color="#b9c8d8"/><stop offset="1" stop-color="#7f93a8"/></linearGradient>
    <linearGradient id="hw2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="48" cy="86" rx="26" ry="4.5" fill="#0a2a52" opacity=".28"/>
    <g transform="rotate(-40 48 48)"><rect x="42" y="30" width="12" height="52" rx="6" fill="url(#hw1)"/>
    <path d="M30 8h12v14a6 6 0 0 0 12 0V8h12v18a18 18 0 0 1-36 0z" fill="url(#hw1)"/>
    <rect x="44" y="34" width="3" height="40" rx="1.5" fill="url(#hw2)"/></g></svg>`,
  pass: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="hp1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9dcf0"/></linearGradient>
    <linearGradient id="hp2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#35c38a"/><stop offset="1" stop-color="#1c9b6c"/></linearGradient></defs>
    <ellipse cx="48" cy="86" rx="26" ry="4.5" fill="#0a2a52" opacity=".28"/>
    <rect x="18" y="12" width="60" height="70" rx="12" fill="url(#hp1)"/><rect x="18" y="12" width="60" height="18" rx="12" fill="url(#hp2)"/><rect x="18" y="24" width="60" height="6" fill="url(#hp2)"/>
    <g fill="#27425f"><rect x="30" y="42" width="14" height="14" rx="3"/><rect x="52" y="42" width="14" height="14" rx="3"/><rect x="30" y="62" width="14" height="10" rx="3"/><rect x="52" y="62" width="6" height="6" rx="1.5"/><rect x="61" y="65" width="5" height="7" rx="1.5"/></g></svg>`,
  note: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="hn1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6f5cf"/><stop offset=".6" stop-color="#46c98a"/><stop offset="1" stop-color="#1c9b6c"/></linearGradient>
    <linearGradient id="hn2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="48" cy="82" rx="28" ry="4.5" fill="#0a2a52" opacity=".28"/>
    <g transform="rotate(-10 48 46)"><rect x="12" y="22" width="72" height="44" rx="9" fill="url(#hn1)"/><rect x="12" y="22" width="72" height="20" rx="9" fill="url(#hn2)"/>
    <circle cx="48" cy="44" r="12" fill="#fff" opacity=".9"/><path d="M43 39h10M43 44h10M46 39c5 0 7 2 7 4.4S50 48 46 48l7 6" fill="none" stroke="#1c9b6c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="25" cy="44" r="3.2" fill="#fff" opacity=".6"/><circle cx="71" cy="44" r="3.2" fill="#fff" opacity=".6"/></g></svg>`,
  key: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="hk1" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff4b8"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#d9791a"/></radialGradient></defs>
    <ellipse cx="48" cy="86" rx="26" ry="4.5" fill="#0a2a52" opacity=".28"/>
    <circle cx="34" cy="38" r="22" fill="url(#hk1)"/><circle cx="34" cy="38" r="9" fill="#0d3d6e" opacity=".55"/>
    <path d="M48 52l26 26M62 66l8-8M70 74l8-8" stroke="url(#hk1)" stroke-width="9" stroke-linecap="round" fill="none"/>
    <ellipse cx="26" cy="28" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 26 28)"/></svg>`,
};

export function hero(name, cls = 'hero-art') {
  const el = svgFrom(HERO[name]);
  el.setAttribute('class', cls);
  return el;
}
