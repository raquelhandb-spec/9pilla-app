// 9Pilla: funciona offline com a última versão do app; dados de mercado sempre tentam a rede primeiro
const CACHE = '9pilla-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ erro: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (url.origin === location.origin) {
    // rede primeiro para pegar melhorias novas; cache se estiver sem internet
    e.respondWith(fetch(e.request).then((r) => {
      const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
  }
});
