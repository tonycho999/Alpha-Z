// sw.js

// [중요] 버전을 꼭 변경해야 업데이트가 됩니다! (v1 -> v1.5)
const CACHE_NAME = 'alpha-z-v2.7'; 

// 캐싱할 파일 목록
const CACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './og-image.png',
    
    // JS 파일들
    './js/game-main.js',
    './js/game-core.js',
    './js/game-data.js',
    './js/game-ui.js',
    './js/game-flow.js',
    './js/game-logic.js',
    './js/game-audio.js',
    './js/firebase-config.js',

    // 라이브러리
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
    
    // 에셋
    './assets/button.mp3',
    './assets/drop.mp3',
    './assets/merge.mp3',
    './assets/over.mp3',
    './icon-192.png',
    './icon-512.png'
];

// 나머지 install, fetch, activate 코드는 그대로 두셔도 됩니다.
// (생략... 위에서 작성해주신 코드 그대로 사용)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(CACHE_URLS);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request).catch(() => {});
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
