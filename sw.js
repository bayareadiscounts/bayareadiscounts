const CACHE_NAME = 'bay-area-benefits-v2';
const urlsToCache = [
  '/',
  '/students.html',
  '/nonprofit-resources.html',
  '/assets/css/vision-pro-optimized.css',
  '/assets/css/accessibility-toolbar.css',
  '/assets/css/read-more.css',
  '/assets/js/search-filter.js',
  '/assets/js/accessibility-toolbar.js',
  '/assets/js/read-more.js',
  '/assets/images/favicons/favicon-96x96.png',
  '/assets/images/favicons/favicon.svg',
  '/assets/images/favicons/apple-touch-icon.png',
  '/assets/images/logo/banner.svg',
  '/assets/images/logo/logo.svg'
];

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Cache installation failed:', err);
      })
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          // Allow both 'basic' (same-origin) and 'cors' (cross-origin with CORS) responses
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            })
            .catch(err => {
              console.error('Failed to cache:', err);
            });

          return response;
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
