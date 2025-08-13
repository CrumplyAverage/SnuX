const CACHE_NAME = 'snux-v2-cache-' + (self.registration ? self.registration.scope : 'scope');
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'assets/SNUX.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/noise.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if(k.startsWith('snux-v2-cache-') && k !== CACHE_NAME){ return caches.delete(k); }
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  const url = new URL(evt.request.url);
  // Only handle same-origin
  if (url.origin !== location.origin) return;
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      return cached || fetch(evt.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
        return resp;
      }).catch(() => caches.match('index.html'));
    })
  );
});
