const CACHE_NAME = 'bic-pro-cache-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/converter.js',
  '/js/worker.js',
  '/manifest.json', // Added manifest.json to cache
  // External libraries - consider caching local copies in a real app for robustness
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.tailwindcss.com', // Note: TailwindCSS is often built, but if using CDN for dev, it can be cached
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/tiff.js@1.0.0/tiff.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js',
  // Key icons (ensure these paths are correct relative to the manifest and actual file locations)
  // Based on previous manifest, these are relative to root.
  // If actual files are in /favicon/, paths should reflect that.
  // For now, assuming they might be moved to root or these paths are placeholders.
  '/favicon/android-chrome-192x192.png',
  '/favicon/android-chrome-512x512.png',
  '/favicon/apple-touch-icon.png',
  '/favicon/favicon-32x32.png',
  '/favicon/favicon-16x16.png'
  // Add other important assets like fonts if any
];

// Install event: Open cache and add assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(assetsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Ensure new SW takes control immediately
});

// Fetch event: Serve from cache first, then network, update cache if network fetch succeeds
self.addEventListener('fetch', event => {
  // For non-GET requests, and requests to other origins (unless critical CDNs already listed), use network only
  if (event.request.method !== 'GET' || !(event.request.url.startsWith(self.location.origin) || assetsToCache.some(url => event.request.url.startsWith(url.split('/').slice(0,3).join('/')) && !url.startsWith('/')) )) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If the request is successful and for an asset we want to cache (or same origin)
          if (networkResponse && networkResponse.status === 200) {
            // Check if it's one of the core assets or from the same origin
             const isCoreAsset = assetsToCache.includes(event.request.url.replace(self.location.origin, '')) || assetsToCache.includes(event.request.url);
             const isSameOrigin = event.request.url.startsWith(self.location.origin);

            if (isCoreAsset || isSameOrigin) {
                console.log(`Service Worker: Caching new resource: ${event.request.url}`);
                cache.put(event.request, networkResponse.clone());
            }
          }
          return networkResponse;
        }).catch(error => {
          console.warn(`Service Worker: Fetch failed for ${event.request.url}; returning offline page or error.`, error);
          // Optionally, return a generic offline page here if assetsToCache.includes('/offline.html')
          // return caches.match('/offline.html');
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
