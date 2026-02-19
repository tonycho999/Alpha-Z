// js/index.js

let deferredPrompt;

window.onload = function() {
    // 1. 관리자 체크
    const admin = localStorage.getItem('alpha_admin') === 'true';
    if(admin) localStorage.setItem('alpha_stars', '10000');
    
    // 2. 스타 표시
    const stars = localStorage.getItem('alpha_stars') || 0;
    const starsEl = document.getElementById('idx-stars');
    if(starsEl) starsEl.textContent = admin ? 'ADMIN (10000)' : stars;

    // 3. 관리자면 광고 배너 삭제
    if(admin) {
        const adBox = document.getElementById('ad-container');
        if (adBox) adBox.classList.add('admin-no-ad');
    }

    // 4. PWA 앱 설치 버튼 로직
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            document.getElementById('install-btn').style.display = 'block';
        }
    });

    const installBtn = document.getElementById('install-btn');
    if(installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installBtn.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
    }

    // 5. 모바일/PC 감지 및 QR 팝업 로직
    const tute = document.getElementById('popup-tute');
    const qrSec = document.getElementById('desktop-qr-sec');
    const nomoreContainer = document.getElementById('nomore-container');
    const hide = localStorage.getItem('hideTutorial');

    // 정규식을 사용해 현재 접속한 기기가 모바일(스마트폰/태블릿)인지 판별
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
        // [PC/노트북] : 무조건 팝업 띄움, QR 보이기, '다시 보지 않기' 숨기기
        if(tute) tute.style.display = 'flex';
        if(qrSec) qrSec.style.display = 'block';
        if(nomoreContainer) nomoreContainer.style.display = 'none';
    } else {
        // [모바일] : '다시 보지 않기'를 체크 안 했을 때만 팝업 띄움, QR 숨기기
        if (!hide) {
            if(tute) tute.style.display = 'flex';
            if(qrSec) qrSec.style.display = 'none';
            if(nomoreContainer) nomoreContainer.style.display = 'block';
        }
    }
};

window.closeTute = function() {
    const chk = document.getElementById('chk-nomore');
    // 모바일 환경에서 '다시 보지 않기'를 체크했을 경우만 저장
    if(chk && chk.checked) {
        localStorage.setItem('hideTutorial', 'true');
    }
    document.getElementById('popup-tute').style.display = 'none';
};

window.selectDiff = function(diff) {
    window.location.href = `game.html?diff=${diff}`;
};
