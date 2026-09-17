// Service Worker для "28 дней — личный эксперимент".
// Кеширует статическую оболочку приложения, чтобы после первого визита
// всё работало офлайн. Пользовательские данные тут ни при чём — они
// живут только в IndexedDB на устройстве и никогда не проходят через сеть.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `experiment28-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './app/main.js',
  './app/db.js',
  './app/nav.js',
  './app/state.js',
  './app/types.js',
  './app/onboarding.js',
  './app/export-import.js',
  './app/ai-prompt.js',
  './app/scale-icons.js',
  './app/theme.js',
  './app/screens/home.js',
  './app/screens/today.js',
  './app/screens/experiment.js',
  './app/screens/ai.js',
  './app/screens/summary.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('SW install: failed to cache app shell', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Стратегия: cache-first для оболочки приложения, с фоновым обновлением кеша.
// Никаких запросов с пользовательскими данными это приложение не делает.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // не кешируем сторонние запросы

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
