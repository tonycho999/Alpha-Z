// 캐시 이름 (버전 업데이트 시 숫자를 올리세요: v1 -> v2)
const CACHE_NAME = 'alpha-z-v1';

// 캐싱할 파일 목록 (경로가 정확해야 합니다!)
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

    // Firebase 라이브러리 (오프라인 구동을 위해 캐싱 필요)
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
    
    // 오디오 파일 (파일명이 정확한지 확인하세요!)
    './assets/button.mp3',
    './assets/drop.mp3',
    './assets/merge.mp3',
    './assets/over.mp3',
    // 아이콘
    './icon-192.png',
    './icon-512.png'
];

// 1. 설치 (파일 캐싱)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(CACHE_URLS);
            })
    );
});

// 2. 요청 가로채기 (오프라인일 때 캐시된 파일 제공)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에 있으면 반환, 없으면 네트워크 요청
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    // 네트워크도 안 되고 캐시도 없으면 에러 처리가 필요하지만,
                    // 게임 핵심 로직은 다 캐싱했으므로 괜찮음.
                });
            })
    );
});

// 3. 업데이트 (구버전 캐시 삭제)
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
