import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// 초기화
window.initGame = (diff) => {
    state.diff = diff || 'NORMAL';
    state.isSaved = false; // 새 게임 시작 시 저장 상태 리셋
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

    // 1. [팝업 감지] 게임 오버 팝업이 뜰 때 UI 갱신 (MutationObserver 사용)
    // 팝업이 'display: block' 등으로 바뀔 때 updateGameOverUI를 실행해 버튼 노출 여부를 결정함
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'popup-over' && mutation.target.style.display !== 'none') {
                state.isSaved = false; // 저장 상태 초기화
                UI.updateGameOverUI(); // ★ 저장 버튼 노출 여부 판단
            }
        });
    });
    const popup = document.getElementById('popup-over');
    if(popup) observer.observe(popup, { attributes: true, attributeFilter: ['style'] });


    // 2. [버튼 클릭 처리] 이벤트 위임 (Event Delegation)
    document.addEventListener('click', async (e) => {
        
        // --- [상황 A] 신규 유저 저장 ---
        if (e.target && e.target.id === 'btn-check-save') {
            if(window.playBtnSound) window.playBtnSound();

            const nameInput = document.getElementById('username-input');
            const errBox = document.getElementById('save-error');
            const name = nameInput ? nameInput.value.trim() : '';
            
            // 에러 박스 초기화
            if(errBox) errBox.style.display = 'none';

            if(!name) {
                if(errBox) { errBox.textContent = "Please enter a name."; errBox.style.display = 'block'; }
                return;
            }
            
            // 버튼 잠금
            e.target.disabled = true;
            e.target.textContent = "Checking...";

            // 관리자 커맨드 체크
            if (checkAdmin(name)) {
                updateAdminUI();
                alert(`Hello Admin ${name}! Ads removed.`);
                UI.updateUI(); 
            }

            // DB 저장 시도 (isNewUser = true)
            const res = await Core.saveScoreToDB(name, true);
            
            e.target.disabled = false;
            e.target.textContent = "Save Record";

            if(res.success) {
                // 저장 성공 -> 기기에 ID 박제
                state.isSaved = true;
                localStorage.setItem('alpha_username', name); 
                localStorage.setItem('alpha_best_char', state.best);
                
                // UI 갱신 (성공 메시지 출력)
                UI.updateGameOverUI(); 
            } else {
                // 실패 (중복 ID 등)
                if(errBox) {
                    errBox.textContent = res.msg; 
                    errBox.style.display = 'block';
                } else {
                    alert(res.msg);
                }
            }
        }

        // --- [상황 B] 기존 유저 저장 (신기록일 때만 버튼 보임) ---
        if (e.target && e.target.id === 'btn-just-save') {
            if(window.playBtnSound) window.playBtnSound();
            
            const savedName = localStorage.getItem('alpha_username');
            
            e.target.disabled = true;
            e.target.textContent = "Saving...";

            // DB 저장 시도 (isNewUser = false)
            const res = await Core.saveScoreToDB(savedName, false);

            e.target.disabled = false;
            e.target.textContent = "Update Best Score";
            
            if(res.success) {
                state.isSaved = true;
                localStorage.setItem('alpha_best_char', state.best); // 내 최고 기록 갱신
                UI.updateGameOverUI(); 
            } else {
                alert("Save Failed: " + res.msg);
            }
        }
    });
};
