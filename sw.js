// Çevrimdışı oynanış için uygulama kabuğunu önbelleğe alır.
const CACHE = 'demir-cephe-v24';
const FILES = ['./', './index.html', './css/style.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './js/data/map.js', './js/data/countries.js', './js/data/content.js', './js/data/leaders.js', './js/data/focus.js', './js/data/focus_ext.js', './js/data/focus_more.js', './js/data/focus_alt.js', './js/data/rivers.js', './js/data/decisions.js', './js/game/core.js', './js/game/rivers.js', './js/game/tactics.js', './js/game/state.js', './js/game/sim.js', './js/game/diplomacy.js', './js/game/ai.js', './js/game/army.js', './js/game/politics.js', './js/game/trade.js', './js/game/navy.js', './js/game/logistics.js', './js/game/airwar.js', './js/game/peace.js', './js/game/design.js', './js/game/airbase.js', './js/game/occupation.js', './js/game/decisions.js', './js/game/events.js', './js/game/events_ext.js', './js/game/hist_ext.js', './js/game/autonomy.js', './js/game/projects.js', './js/game/airborne.js', './js/game/bop.js', './js/game/fuel.js', './js/game/volunteers.js', './js/game/elections.js', './js/game/ledger.js', './js/game/civilwar.js', './js/ui/flags.js', './js/ui/icons.js', './js/ui/render.js', './js/ui/ui.js', './js/ui/audio.js', './js/ui/tutorial.js', './js/ui/eventart.js', './js/ui/ledger.js', './js/main.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
