// Service Worker для Vocabulary Trainer Pro
// Кэширует главную страницу, чтобы приложение работало офлайн

const CACHE_NAME = 'vocab-trainer-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Установка — кэшируем ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn('Не удалось закэшировать некоторые файлы:', err);
      });
    })
  );
  self.skipWaiting();
});

// Активация — чистим старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — сначала пробуем из сети, если не получилось — из кэша
// Для index.html всегда сначала сеть (чтобы получить обновления)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API-запросы (перевод, озвучка) — не кэшируем
  if (url.hostname.includes('mymemory') ||
      url.hostname.includes('languagetool')) {
    return;
  }

  // Навигационные запросы (открытие страницы) — сначала сеть, потом кэш
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Остальные — сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Кэшируем только успешные GET-ответы
        if (event.request.method === 'GET' && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
