const CACHE_NAME = 'apna-cricket-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/main.tsx',
  './src/index.css',
  './favicon.ico'
];

// Installs SW and caches initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Pre-cache warning: some items failed to pre-cache', err);
      });
    })
  );
  self.skipWaiting();
});

// Cleans up legacy cache stores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] System purge legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache-first (with network fallback) for assets/images, network-first for pages and dynamic assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // We only intercept GET requests
  if (req.method !== 'GET') return;

  // Ignore Firebase socket connections, analytics, hot reloading etc.
  if (
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebase') || 
    url.pathname.includes('/@vite') || 
    url.pathname.includes('chrome-extension')
  ) {
    return;
  }

  // Match cache-first for images, fonts, and stylesheets
  const isStaticAsset = 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.woff') || 
    url.pathname.endsWith('.woff2') || 
    url.pathname.endsWith('.ttf') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.js');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache but optionally fetch a fresh version in background (stale-while-revalidate)
          fetch(req).then((freshResponse) => {
            if (freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, freshResponse));
            }
          }).catch(() => {/* Silent offline fallback */});
          
          return cachedResponse;
        }

        // Not in cache, fetch and store
        return fetch(req).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
          return response;
        }).catch(() => {
          // Network failed
          return new Response('Offline asset unavailable', { status: 503, statusText: 'Offline' });
        });
      })
    );
  } else {
    // General text, HTML, routing URLs - Network First, fallback to cache
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache index.html for clientside router navigation offline compatibility
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            
            // If they are navigating to a path offline, return cached index
            if (req.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html') || caches.match('./');
            }
            
            return new Response('<h1>Offline Mode</h1><p>Check your internet connection connection to access Apna Cricket.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
  }
});
