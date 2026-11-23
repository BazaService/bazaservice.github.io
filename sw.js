// Офлайн-режим: застосунок відкривається навіть без інтернету.
const V = 'bs-v2';
const CORE = ['./', './index.html', './firebase-config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function fromCache(req) {
  return (await caches.match(req)) || (await caches.match('./index.html'));
}
function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(async () => finish(await fromCache(req)), 3000);
    fetch(req).then(r => {
      if (r.ok) { const cl = r.clone(); caches.open(V).then(c => c.put(req, cl)); }
      clearTimeout(t); finish(r);
    }).catch(async () => { clearTimeout(t); finish((await fromCache(req)) || Response.error()); });
  });
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const isApp = u.origin === self.location.origin;
  const isSdk = u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');
  const isFont = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (isSdk || isFont) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (isApp) e.respondWith(networkFirst(e.request));
});
