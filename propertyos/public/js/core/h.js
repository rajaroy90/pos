// Tiny DOM helper. Text is always set as text nodes, never as HTML, so user data cannot inject markup.
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop', 'ellipse', 'line', 'filter', 'feImage', 'feDisplacementMap', 'feGaussianBlur', 'feColorMatrix', 'feBlend', 'polygon']);

export function h(tag, props, ...kids) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') setStyle(el, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value' && 'value' in el) el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') { if (v) el.setAttribute(k, ''); el[k] = !!v; }
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, kids);
  return el;
}

/** Style via CSSOM (allowed under a strict CSP, unlike the style="" attribute). Supports --custom-props. */
export function setStyle(el, styles) {
  for (const [k, v] of Object.entries(styles)) {
    if (v === null || v === undefined || v === false) el.style.removeProperty(k.startsWith('--') ? k : k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));
    else if (k.startsWith('--')) el.style.setProperty(k, String(v));
    else el.style[k] = v;
  }
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false || k === true) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function mount(el, ...kids) {
  clear(el);
  return append(el, kids);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Trusted, static SVG markup only (never pass user data). */
export function svgFrom(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}
