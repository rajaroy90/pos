// PropertyOS service worker: lets the app open offline.
// Static files: network first (so every module comes from one release), cache as the fallback.
// /api is never cached here; the app keeps its own small stale copy of recent screens.
const CACHE = 'propertyos-748ce27b9b';
const SHELL = [
  "/",
  "/css/apps.css",
  "/css/glass.css",
  "/css/shell.css",
  "/css/workspace.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
  "/icons/maskable-512.png",
  "/js/apps/auth.js",
  "/js/apps/common.js",
  "/js/apps/gate.js",
  "/js/apps/join.js",
  "/js/apps/passimg.js",
  "/js/apps/properties.js",
  "/js/apps/registry.js",
  "/js/apps/rent.js",
  "/js/apps/repairs.js",
  "/js/apps/settings.js",
  "/js/apps/verify.js",
  "/js/apps/visitors.js",
  "/js/core/api.js",
  "/js/core/csv.js",
  "/js/core/data.js",
  "/js/core/format.js",
  "/js/core/fx.js",
  "/js/core/h.js",
  "/js/core/i18n.js",
  "/js/core/icons.js",
  "/js/core/layers.js",
  "/js/core/photo.js",
  "/js/core/qr.js",
  "/js/core/store.js",
  "/js/core/strings.en.js",
  "/js/core/strings.hi.js",
  "/js/core/ui.js",
  "/js/main.js",
  "/js/shell/home.js",
  "/js/shell/panels.js",
  "/js/shell/pin.js",
  "/js/shell/refract.js",
  "/js/shell/welcome.js",
  "/js/shell/workspace.js",
  "/manifest.webmanifest",
  "/index.html"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(req), timeout(4000)]);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await cache.match('/index.html');
        if (shell) return shell;
      }
      return new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
    }
  })());
});
