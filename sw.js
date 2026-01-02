const CACHE_VERSION = 'v5';
const CACHE_NAME = `bay-navigator-${CACHE_VERSION}`;
const API_CACHE_NAME = `bay-area-api-${CACHE_VERSION}`;
const BASE_URL = self.registration.scope.replace(/\/$/, '');
const OFFLINE_URL = `${BASE_URL}/offline.html`;
const API_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const urlsToCache = [
  `${BASE_URL}/`,
  `${BASE_URL}/favorites.html`,
  `${BASE_URL}/eligibility/`,
  `${BASE_URL}/about.html`,
  `${BASE_URL}/assets/css/base.css`,
  `${BASE_URL}/assets/css/responsive-optimized.css`,
  `${BASE_URL}/assets/css/accessibility-toolbar.css`,
  `${BASE_URL}/assets/css/read-more.css`,
  `${BASE_URL}/assets/css/onboarding.css`,
  `${BASE_URL}/assets/js/search-filter.js`,
  `${BASE_URL}/assets/js/accessibility-toolbar.js`,
  `${BASE_URL}/assets/js/read-more.js`,
  `${BASE_URL}/assets/js/favorites.js`,
  `${BASE_URL}/assets/js/apca-contrast.js`,
  `${BASE_URL}/assets/js/preferences.js`,
  `${BASE_URL}/assets/js/onboarding.js`,
  `${BASE_URL}/assets/images/favicons/favicon-96x96.png`,
  `${BASE_URL}/assets/images/favicons/favicon.svg`,
  `${BASE_URL}/assets/images/favicons/apple-touch-icon.png`,
  `${BASE_URL}/assets/images/logo/banner.svg`,
  `${BASE_URL}/assets/images/logo/logo.svg`,
  OFFLINE_URL
];

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Cache installation failed:', err))
  );
  self.skipWaiting();
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with stale-while-revalidate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          cacheResponse(request, response.clone());
          return response;
        })
        .catch(() => caches.match(request).then(resp => resp || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          cacheResponse(request, response.clone());
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// Handle API requests with stale-while-revalidate
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);

  // Return cached version while fetching fresh data
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(err => {
      console.log('API fetch failed, using cache:', err);
      return null;
    });

  return cached || fetchPromise;
}

// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!cacheWhitelist.includes(cacheName)) {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
        return undefined;
      })
    ))
  );
  self.clients.claim();
});

function cacheResponse(request, response) {
  if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
    return;
  }

  caches.open(CACHE_NAME)
    .then(cache => cache.put(request, response))
    .catch(err => console.error('Failed to cache:', err));
}
