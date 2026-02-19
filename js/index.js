let deferredPrompt;

window.onload = function() {
    const admin = localStorage.getItem('alpha_admin') === 'true';
    if(admin) localStorage.setItem('alpha_stars', '10000');
    
    const stars = localStorage.getItem('alpha_stars') || 0;
    document.getElementById('idx-stars').textContent = admin ? 'ADMIN (10000)' : stars;

    if(admin) {
        const adBox = document.getElementById('ad-container');
        if (adBox) adBox.classList.add('admin-no-ad');
    }

    // PWA 인스톨 이벤트 캡처
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // 스탠드얼론(이미 설치됨)이 아닐 때만 버튼 보이기
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            document.getElementById('install-btn').style.display = 'block';
        }
    });

    document.getElementById('install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                document.getElementById('install-btn').style.display = 'none';
            }
            deferredPrompt = null;
        }
    });
};

window.selectDiff = function(diff) {
    window.location.href = `game.html?diff=${diff}`;
};
