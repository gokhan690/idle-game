// Çevrimdışı oynanış için uygulama kabuğunu önbelleğe alır.
const CACHE = 'demir-cephe-v1';
const FILES = ['./', './index.html', './css/style.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './js/data/map.js', './js/data/countries.js', './js/data/content.js', './js/game/core.js', './js/game/state.js', './js/game/sim.js',
  './js/game/diplomacy.js', './js/game/ai.js', './js/game/events.js', './js/ui/flags.js', './js/ui/render.js', './js/ui/ui.js', './js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
