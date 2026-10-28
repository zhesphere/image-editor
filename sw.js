const CACHE = 'orbitvo-image-tool-v6';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './favicon.svg', './manifest.webmanifest', './privacy.html'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const forRequest = response.clone();
            const forIndex = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, forRequest);
              cache.put('./index.html', forIndex);
            });
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // CSS/JS/assets: prefer cache, refresh in background. Never fall back to HTML.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetching = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
