
const CACHE_NAME = 'alpha-z-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/game.html',
  '/style.css',
  '/js/index.js',
  '/js/game-main.js',
  '/js/game-core.js',
  '/js/game-data.js',
  '/js/game-ui.js',
  '/js/shop.js',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
