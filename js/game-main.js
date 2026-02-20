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
    AudioMgr.init();
    
    // 데이터 로드
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

    // ============================================================
    // [핵심 수정] 버튼 클릭 인식 개선 (closest 사용 + 디버깅 알림)
    // ============================================================
    document.addEventListener('click', async (e) => {
        
        // 클릭된 요소가 버튼이거나 버튼 내부라면 버튼을 찾음
        const targetBtn = e.target.closest('button');
        if (!targetBtn) return; // 버튼이 아니면 무시

        // 1. [신규 유저] 저장 버튼
        if (targetBtn.id === 'btn-check-save') {
            console.log("🖱️ 신규 저장 버튼 클릭됨!"); // 콘솔 확인용
            // alert("저장 버튼이 눌렸습니다! DB 전송을 시작합니다."); // [확인용 알림]

            if(window.playBtnSound) window.playBtnSound();

            const nameInput = document.getElementById('username-input');
            const errBox = document.getElementById('save-error');
            const name = nameInput ? nameInput.value.trim() : '';
            
            if(errBox) errBox.style.display = 'none';

            if(!name) {
                if(errBox) { errBox.textContent = "Please enter a name."; errBox.style.display = 'block'; }
                else alert("Please enter a name.");
                return;
            }
            
            targetBtn.disabled = true;
            targetBtn.textContent = "Checking...";

            if (checkAdmin(name)) {
                updateAdminUI();
                UI.updateUI(); 
            }

            // DB 저장 호출
            const res = await Core.saveScoreToDB(name, true);
            
            targetBtn.disabled = false;
            targetBtn.textContent = "Save Record";

            if(res.success) {
                state.isSaved = true;
                localStorage.setItem('alpha_username', name); 
                localStorage.setItem('alpha_best_char', state.best);
                UI.updateGameOverUI(); 
                alert("✅ 저장 성공! (Saved Successfully)"); 
            } else {
                if(errBox) {
                    errBox.textContent = res.msg; 
                    errBox.style.display = 'block';
                }
                alert("❌ 저장 실패: " + res.msg);
            }
        }

        // 2. [기존 유저] 저장 버튼
        if (targetBtn.id === 'btn-just-save') {
            console.log("🖱️ 기존 유저 저장 버튼 클릭됨!");
            
            if(window.playBtnSound) window.playBtnSound();
            
            const savedName = localStorage.getItem('alpha_username');
            
            targetBtn.disabled = true;
            targetBtn.textContent = "Saving...";

            const res = await Core.saveScoreToDB(savedName, false);

            targetBtn.disabled = false;
            targetBtn.textContent = "Update Best Score";
            
            if(res.success) {
                state.isSaved = true;
                localStorage.setItem('alpha_best_char', state.best); 
                UI.updateGameOverUI(); 
                alert("✅ 업데이트 성공! (Update Successfully)");
            } else {
                alert("❌ 저장 실패: " + res.msg);
            }
        }
    });
};
