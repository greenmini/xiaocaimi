/* ═══════════════════════════════════════════════
   小财迷 · Service Worker
   策略: 缓存优先 + 版本化缓存名 + OTA 更新通知
   ═══════════════════════════════════════════════ */

const CACHE_PREFIX = 'xiaocaimi';
const STATIC_CACHE = CACHE_PREFIX + '-v6.4';
const DYNAMIC_CACHE = CACHE_PREFIX + '-dynamic';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/version.json',
  '/js/nav.js',
  '/js/i18n.js',
  '/js/storage.js',
  '/js/migrate.js',
  '/js/model.js',
  '/js/categories.js',
  '/js/utils.js',
  '/js/db.js',
  '/js/adapter.js',
  '/js/render.js',
  '/js/calendar.js',
  '/js/reminders.js',
  '/js/tasks.js',
  '/js/shopping.js',
  '/js/notes.js',
  '/js/contacts.js',
  '/js/documents.js',
  '/js/birthdays.js',
  '/js/meals.js',
  '/js/app.js',
  '/js/init.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Precache 部分失败:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:' || url.protocol === 'data:') return;

  if (url.pathname === '/api/data' || url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname !== '/version.json') {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(
      (async () => {
        try {
          const res = await fetch('/version.json?t=' + Date.now());
          const server = await res.json();
          const clientCache = await caches.match('/version.json');
          const client = clientCache ? await clientCache.json() : null;
          if (client && server.version !== client.version) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.addAll(STATIC_ASSETS);
            event.source.postMessage({ type: 'UPDATE_AVAILABLE', version: server.version });
          }
        } catch (e) {
          console.warn('[SW] 版本检查失败:', e);
        }
      })()
    );
  }
});
