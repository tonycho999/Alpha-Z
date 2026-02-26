// [중요] 버전을 꼭 변경해야 업데이트가 됩니다!
const CACHE_NAME = 'alpha-z-v9.2'; 

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

    // 라이브러리 (Firebase는 캐싱해도 되지만, Poki/Crazy SDK는 캐싱하지 않음)
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

// 설치 (Install)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(CACHE_URLS);
            })
    );
});

// 요청 (Fetch)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에 있으면 반환, 없으면 네트워크 요청
                if (response) return response;
                return fetch(event.request).catch(() => {});
            })
    );
});

// 활성화 (Activate) - 구버전 캐시 삭제
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
