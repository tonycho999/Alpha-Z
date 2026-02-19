// js/index.js

window.onload = function() {
    // 1. 어드민(Admin) 모드 체크 (stars 10000 지급)
    const admin = localStorage.getItem('alpha_admin') === 'true';
    if(admin) {
        localStorage.setItem('alpha_stars', '10000');
    }
    
    // 2. 보유 스타 화면에 표시
    const stars = localStorage.getItem('alpha_stars') || 0;
    const starsEl = document.getElementById('idx-stars');
    if(starsEl) {
        starsEl.textContent = admin ? 'ADMIN (10000)' : stars;
    }

    // 3. 튜토리얼 팝업 표시 (다시 보지 않기 체크 안 한 경우만)
    const hide = localStorage.getItem('hideTutorial');
    if(!hide) {
        const tute = document.getElementById('popup-tute');
        if(tute) tute.style.display = 'flex';
    }
};

// 튜토리얼 닫기 버튼
window.closeTute = function() {
    const chk = document.getElementById('chk-nomore');
    if(chk && chk.checked) {
        localStorage.setItem('hideTutorial', 'true');
    }
    document.getElementById('popup-tute').style.display = 'none';
};

// 게임 난이도 선택 후 게임 화면으로 이동
window.selectDiff = function(diff) {
    window.location.href = `game.html?diff=${diff}`;
};
