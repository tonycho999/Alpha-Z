import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [핵심 수정] 초기화 순서 변경 및 오디오 해제
window.initGame = (diff) => {
    // 1. 데이터 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // 2. [중요] 사용자 클릭(게임 시작 버튼) 직후 오디오 잠금 해제
    AudioMgr.resumeContext();

    // 3. 화면 그리기 (requestAnimationFrame으로 타이밍 보장)
    requestAnimationFrame(() => {
        // 그리드 생성
        UI.renderGrid();
        
        // 게임 로직 시작 (핸드 채우기)
        Flow.checkHandAndRefill();
        
        // UI 업데이트
        UI.updateUI();
    });
};

window.onload = () => {
    // 1. 오디오 파일 미리 로드
    AudioMgr.init();
    
    // 2. 전역 클릭 사운드 설정 (버튼 클릭음)
    AudioMgr.setupGlobalClicks();

    // 3. 사운드 토글 버튼 연결
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    // 4. 데이터 로드
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    UI.updateUI();

    // 5. 저장 버튼 이벤트 연결
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
