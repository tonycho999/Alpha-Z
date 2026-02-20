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

    // ============================================================
    // [핵심 수정] 이벤트 위임 (Event Delegation)
    // 버튼이 나중에 생겨도 클릭이 되도록 document에 이벤트를 겁니다.
    // ============================================================
    document.addEventListener('click', async (e) => {
        
        // 1. [신규 유저] 저장 버튼 클릭 감지
        if (e.target && e.target.id === 'btn-check-save') {
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

            // 저장 중 버튼 비활성화 (중복 클릭 방지)
            e.target.disabled = true;
            e.target.textContent = "Saving...";

            const res = await Core.saveScoreToDB(name, true);
            
            // 버튼 복구
            e.target.disabled = false;
            e.target.textContent = "Save";

            if(res.success) {
                const areaNew = document.getElementById('area-new-user');
                const msgBox = document.getElementById('save-msg');
                
                if(areaNew) areaNew.style.display = 'none';
                if(msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.innerText = res.msg; // 성공/보존 메시지 출력
                }
                localStorage.setItem('alpha_username', name);
            } else {
                alert("Save Failed: " + res.msg);
            }
        }

        // 2. [기존 유저] 저장 버튼 클릭 감지
        if (e.target && e.target.id === 'btn-just-save') {
            if(window.playBtnSound) window.playBtnSound();
            
            const savedName = localStorage.getItem('alpha_username');
            
            // 저장 중 버튼 비활성화
            e.target.disabled = true;
            e.target.textContent = "Saving...";

            const res = await Core.saveScoreToDB(savedName, false);

            e.target.disabled = false;
            e.target.textContent = "Update Score";
            
            if(res.success) {
                const areaExist = document.getElementById('area-exist-user');
                const msgBox = document.getElementById('save-msg');
                
                if(areaExist) areaExist.style.display = 'none';
                if(msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.innerText = res.msg; // 성공/보존 메시지 출력
                }
            } else {
                alert("Save Failed: " + res.msg);
            }
        }
    });
};
