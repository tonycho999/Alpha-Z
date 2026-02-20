// [디버깅] 파일이 로드되면 즉시 로그 출력
console.log("🚀 game-main.js 파일 로드 시작됨!");

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

window.onload = () => {
    console.log("✅ window.onload 실행됨 (게임 준비 완료)");
    
    AudioMgr.init();
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    if(localStorage.getItem('alpha_admin') === 'true') {
        state.isAdmin = true;
    }
    updateAdminUI(); 
    UI.updateUI();

    // 팝업 감시
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

// ============================================================
// [핵심] 버튼 클릭 강제 인식 시스템 (전역 이벤트 리스너)
// ============================================================
// 문서 전체의 클릭을 감시하다가 저장 버튼이 눌리면 낚아챕니다.
document.addEventListener('click', async (e) => {
    
    // 클릭된 요소 확인 (버튼이나 그 내부 요소인지)
    const target = e.target.closest('button');
    if (!target) return; // 버튼 아니면 무시

    console.log("🖱️ 클릭 감지됨:", target.id); // 어떤 버튼을 눌렀는지 로그 출력

    // 1. [신규 유저] 저장 버튼
    if (target.id === 'btn-check-save') {
        console.log("✨ 신규 저장 로직 시작");
        
        if(window.playBtnSound) window.playBtnSound();

        const nameInput = document.getElementById('username-input');
        const errBox = document.getElementById('save-error');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if(errBox) errBox.style.display = 'none';

        if(!name) {
            alert("Please enter a name!");
            return;
        }

        // 버튼 비활성화
        target.disabled = true;
        target.textContent = "Checking...";

        if (checkAdmin(name)) {
            updateAdminUI();
            UI.updateUI(); 
        }

        // DB 저장 호출
        console.log("📡 DB로 데이터 전송 시작...");
        const res = await Core.saveScoreToDB(name, true);
        console.log("📡 DB 응답:", res);
        
        target.disabled = false;
        target.textContent = "Save Record";

        if(res.success) {
            state.isSaved = true;
            localStorage.setItem('alpha_username', name); 
            localStorage.setItem('alpha_best_char', state.best);
            UI.updateGameOverUI(); 
            alert("✅ 저장 성공! (Saved)"); 
        } else {
            if(errBox) {
                errBox.textContent = res.msg; 
                errBox.style.display = 'block';
            }
            alert("❌ 저장 실패: " + res.msg);
        }
    }

    // 2. [기존 유저] 저장 버튼
    if (target.id === 'btn-just-save') {
        console.log("✨ 기존 유저 저장 로직 시작");
        
        if(window.playBtnSound) window.playBtnSound();
        
        const savedName = localStorage.getItem('alpha_username');
        
        target.disabled = true;
        target.textContent = "Saving...";

        const res = await Core.saveScoreToDB(savedName, false);

        target.disabled = false;
        target.textContent = "Update Best Score";
        
        if(res.success) {
            state.isSaved = true;
            localStorage.setItem('alpha_best_char', state.best); 
            UI.updateGameOverUI(); 
            alert("✅ 업데이트 성공! (Updated)");
        } else {
            alert("❌ 저장 실패: " + res.msg);
        }
    }
});
