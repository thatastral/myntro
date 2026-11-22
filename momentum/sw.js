// App shell cache. API responses are NEVER cached here (they hold personal data and must be live);
// the app keeps its own last-known copy in localStorage for instant paints and offline viewing.
const CACHE = 'momentum-v8';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/main.js', 'js/sync.js', 'js/insights.js', 'js/charts.js', 'js/icons.js', 'js/util.js', 'js/dates.js', 'js/ui.js', 'js/fitness.js',
  'js/pages/home.js', 'js/pages/habits.js', 'js/pages/goals.js', 'js/pages/money.js', 'js/pages/career.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // straight to the network
  // Stale-while-revalidate: instant from cache, refreshed in the background for next time.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(res => { if (res.ok && url.origin === location.origin) c.put(e.request, res.clone()); return res; }).catch(() => hit || c.match('index.html'));
    return hit || net;
  }));
});
