// myUMRATA — Service Worker
// Offline-first PWA for GitHub Pages

const CACHE_NAME = 'myumrata-v5';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // External resources remain network-only
  if (url.origin !== self.location.origin) return;

  // Navigation: offline-first
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then(cachedIndex => {
          if (cachedIndex) {

            // Update cache silently when internet is available
            fetch(request)
              .then(response => {
                if (response && response.ok) {
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put('./index.html', response.clone());
                    });
                }
              })
              .catch(() => {});

            return cachedIndex;
          }

          // Emergency fallback
          return fetch(request)
            .catch(() => caches.match('./'));
        })
    );

    return;
  }

  // Same-origin assets: cache first
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {

            if (response && response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, copy);
                });
            }

            return response;
          })
          .catch(() => caches.match('./index.html'));
      })
  );
});
