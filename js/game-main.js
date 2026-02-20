import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [필수] HTML 버튼 연결용 전역 함수
window.toggleSound = () => {
    AudioMgr.toggleMute();
};

// 게임 시작 초기화
window.initGame = (diff) => {
    // 1. 오디오 잠금 해제 (가장 먼저!)
    if(AudioMgr.resumeContext) AudioMgr.resumeContext();

    // 2. 데이터 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // 3. 화면 그리기 (DOM 업데이트 후 실행 보장)
    requestAnimationFrame(() => {
        UI.renderGrid();
        Flow.checkHandAndRefill();
        UI.updateUI();
    });
};

window.onload = () => {
    AudioMgr.init();
    AudioMgr.setupGlobalClicks();

    // 혹시 모를 로드 지연 대비
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => window.toggleSound();
    }

    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    UI.updateUI();

    // 저장 버튼 연결
    const btnCheckSave = document.getElementById('btn-check-save');
    if (btnCheckSave) {
        btnCheckSave.onclick = async () => {
            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            if(!name) return alert('Enter username!');
            
            checkAdmin(name);
            const res = await Core.saveScoreToDB(name, true);
            
            if(res.success) {
                document.getElementById('area-new-user').style.display='none';
                document.getElementById('save-msg').style.display='block';
                UI.updateUI();
            } else {
                alert(res.msg);
            }
        };
    }
    const btnJustSave = document.getElementById('btn-just-save');
    if (btnJustSave) {
        btnJustSave.onclick = () => {
            Core.saveScoreToDB(localStorage.getItem('alpha_username'), false);
            document.getElementById('area-exist-user').style.display='none';
            document.getElementById('save-msg').style.display='block';
        };
    }
};
