const CACHE_NAME = 'snux-v3-cache';
const FILES_TO_CACHE = [
  'index.html','style.css','app.js','manifest.json',
  'assets/SNUX.png','assets/icon-192.png','assets/icon-512.png','assets/noise.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE_NAME ? caches.delete(k):null)))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (evt) => {
  if(evt.request.method!=='GET') return;
  evt.respondWith(
    caches.match(evt.request).then(cached => cached || fetch(evt.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c=>c.put(evt.request, copy));
      return r;
    }).catch(()=>caches.match('index.html')))
  );
});
