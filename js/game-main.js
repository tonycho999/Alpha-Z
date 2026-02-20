import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// 초기화
window.initGame = (diff) => {
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    requestAnimationFrame(() => {
        UI.renderGrid();
        Flow.checkHandAndRefill();
        UI.updateUI();
    });
};

// [핵심] 관리자일 경우 화면 UI 변경 함수
function updateAdminUI() {
    const isAdmin = (localStorage.getItem('alpha_admin') === 'true') || state.isAdmin;
    if (isAdmin) {
        // 1. 하단 배너 제거
        const adContainer = document.getElementById('ad-container');
        if (adContainer) adContainer.style.display = 'none';

        // 2. 게임 오버 부활 버튼 텍스트 변경
        const reviveBtn = document.getElementById('btn-revive-ad');
        if (reviveBtn) {
            reviveBtn.textContent = "👑 Free Revive (Admin)";
            // 배경색도 관리자 느낌으로 변경 (선택사항)
            reviveBtn.style.background = "#9b59b6"; 
        }
    }
}

window.onload = () => {
    AudioMgr.init();
    
    // 데이터 로드
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    // 시작하자마자 관리자 체크 후 UI 갱신
    if(localStorage.getItem('alpha_admin') === 'true') {
        state.isAdmin = true;
    }
    updateAdminUI(); // 배너 숨기기 실행

    UI.updateUI();

    // 저장 버튼 (이름 입력 시 관리자 체크)
    const btnCheckSave = document.getElementById('btn-check-save');
    if (btnCheckSave) {
        btnCheckSave.onclick = async () => {
            if(window.playBtnSound) window.playBtnSound();

            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            
            if(!name) return alert('Please enter your name!');
            
            // 관리자 확인
            if (checkAdmin(name)) {
                updateAdminUI(); // 즉시 배너 제거 및 UI 변경
                alert(`Hello Admin ${name}! Ads removed.`);
                UI.updateUI(); 
            }

            const res = await Core.saveScoreToDB(name, true);
            if(res.success) {
                document.getElementById('area-new-user').style.display='none';
                document.getElementById('save-msg').style.display='block';
                localStorage.setItem('alpha_username', name);
            } else {
                alert("Save Failed: " + res.msg);
            }
        };
    }

    const btnJustSave = document.getElementById('btn-just-save');
    if (btnJustSave) {
        btnJustSave.onclick = async () => {
            if(window.playBtnSound) window.playBtnSound();
            const savedName = localStorage.getItem('alpha_username');
            const res = await Core.saveScoreToDB(savedName, true);
            if(res.success) {
                document.getElementById('area-exist-user').style.display='none';
                document.getElementById('save-msg').style.display='block';
            }
        };
    }
};
