const CACHE_VERSION = 'eastra-v1.0.2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './Logo%20Azzuha.png',
  './Logo%20Azzuha-512.png',
  './Logo%20Azzuha-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(
        APP_SHELL.map(url =>
          cache.add(url).catch(err => console.warn('Precache gagal:', url, err))
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting().then(() => self.clients.claim()));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put('./index.html', response.clone());
    }
    return response;
  } catch (err) {
    return (await cache.match('./index.html')) ||
      (await caches.match('./index.html')) ||
      new Response('<h1>Luar talian</h1><p>Sila sambung semula ke internet.</p>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan cache API data — sentiasa rangkaian.
  if (url.hostname === 'script.google.com' ||
      url.hostname === 'script.googleusercontent.com' ||
      url.hostname === 'api.github.com') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
