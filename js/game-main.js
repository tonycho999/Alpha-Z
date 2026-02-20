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

// 관리자 UI 업데이트
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

window.onload = () => {
    AudioMgr.init();
    
    // 데이터 로드
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    if(localStorage.getItem('alpha_admin') === 'true') {
        state.isAdmin = true;
    }
    updateAdminUI(); 
    UI.updateUI();

    // 1. [신규 유저] 저장 버튼
    const btnCheckSave = document.getElementById('btn-check-save');
    if (btnCheckSave) {
        btnCheckSave.onclick = async () => {
            if(window.playBtnSound) window.playBtnSound();

            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            
            if(!name) return alert('Please enter your name!');
            
            // 관리자 확인
            if (checkAdmin(name)) {
                updateAdminUI();
                alert(`Hello Admin ${name}! Ads removed.`);
                UI.updateUI(); 
            }

            // DB 저장 시도 (isNewUser = true)
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

    // 2. [기존 유저] 저장 버튼
    const btnJustSave = document.getElementById('btn-just-save');
    if (btnJustSave) {
        btnJustSave.onclick = async () => {
            if(window.playBtnSound) window.playBtnSound();
            
            const savedName = localStorage.getItem('alpha_username');
            // DB 저장 시도 (isNewUser = false)
            const res = await Core.saveScoreToDB(savedName, false);
            
            if(res.success) {
                document.getElementById('area-exist-user').style.display='none';
                document.getElementById('save-msg').style.display='block';
            } else {
                alert("Save Failed: " + res.msg);
            }
        };
    }
};
