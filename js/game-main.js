import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// 초기화
window.initGame = (diff) => {
    state.diff = diff || 'NORMAL';
    state.isSaved = false; 
    initGridSize(state.diff);
    requestAnimationFrame(() => {
        UI.renderGrid();
        Flow.checkHandAndRefill();
        UI.updateUI();
    });
};

function updateAdminUI() {
    const isAdmin = (localStorage.getItem('alpha_admin') === 'true') || state.isAdmin;
    if (isAdmin) {
        const adContainer = document.getElementById('ad-container');
        if (adContainer) adContainer.style.display = 'none';
        const reviveBtn = document.getElementById('btn-revive-ad');
        if (reviveBtn) {
            reviveBtn.textContent = "👑 Free Revive (Admin)";
            reviveBtn.style.background = "#9b59b6"; 
        }
    }
}

// ============================================================
// [핵심 수정] HTML에서 onclick으로 바로 호출하는 함수들
// ============================================================

// 1. 신규 유저 저장 함수
window.saveNewUser = async function() {
    console.log("🖱️ 신규 저장 버튼 클릭됨!"); // 콘솔 확인용
    
    // 버튼 찾기
    const btn = document.getElementById('btn-check-save');
    if(btn) { btn.disabled = true; btn.textContent = "Checking..."; }

    if(window.playBtnSound) window.playBtnSound();

    const nameInput = document.getElementById('username-input');
    const errBox = document.getElementById('save-error');
    const name = nameInput ? nameInput.value.trim() : '';
    
    if(errBox) errBox.style.display = 'none';

    if(!name) {
        alert("Please enter a name.");
        if(btn) { btn.disabled = false; btn.textContent = "Save Record"; }
        return;
    }

    if (checkAdmin(name)) {
        updateAdminUI();
        UI.updateUI(); 
    }

    // DB 저장 호출
    const res = await Core.saveScoreToDB(name, true);
    
    if(btn) { btn.disabled = false; btn.textContent = "Save Record"; }

    if(res.success) {
        state.isSaved = true;
        localStorage.setItem('alpha_username', name); 
        localStorage.setItem('alpha_best_char', state.best);
        UI.updateGameOverUI(); 
        alert("✅ 저장 성공!"); 
    } else {
        if(errBox) {
            errBox.textContent = res.msg; 
            errBox.style.display = 'block';
        } else {
            alert("❌ 저장 실패: " + res.msg);
        }
    }
};

// 2. 기존 유저 저장 함수
window.saveExistUser = async function() {
    console.log("🖱️ 기존 유저 저장 버튼 클릭됨!");
    
    const btn = document.getElementById('btn-just-save');
    if(btn) { btn.disabled = true; btn.textContent = "Saving..."; }

    if(window.playBtnSound) window.playBtnSound();
    
    const savedName = localStorage.getItem('alpha_username');
    
    // DB 저장 호출
    const res = await Core.saveScoreToDB(savedName, false);

    if(btn) { btn.disabled = false; btn.textContent = "Update Best Score"; }
    
    if(res.success) {
        state.isSaved = true;
        localStorage.setItem('alpha_best_char', state.best); 
        UI.updateGameOverUI(); 
        alert("✅ 업데이트 성공!");
    } else {
        alert("❌ 저장 실패: " + res.msg);
    }
};

window.onload = () => {
    AudioMgr.init();
    
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    if(localStorage.getItem('alpha_admin') === 'true') {
        state.isAdmin = true;
    }
    updateAdminUI(); 
    UI.updateUI();

    // 팝업 감시 (게임 오버 시 UI 갱신)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'popup-over' && mutation.target.style.display !== 'none') {
                state.isSaved = false;
                UI.updateGameOverUI(); 
            }
        });
    });
    const popup = document.getElementById('popup-over');
    if(popup) observer.observe(popup, { attributes: true, attributeFilter: ['style'] });
};
