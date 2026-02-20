import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [핵심 수정] 초기화 순서 변경
window.initGame = (diff) => {
    // 1. 먼저 데이터를 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // [중요] 화면이 '보이는 상태'가 된 후에 UI를 그려야 사이즈가 정확함
    // HTML에서 classList.remove('hidden')이 실행된 직후에 이 함수가 호출되므로
    // 브라우저가 화면을 그릴 시간을 줌 (requestAnimationFrame)
    requestAnimationFrame(() => {
        // 2. 오디오 시스템 활성화 (사용자 클릭 직후라 허용됨)
        AudioMgr.resumeContext();

        // 3. 그리드 생성 및 렌더링
        // 이제 화면에 보드가 보이므로 너비 계산이 정확해짐
        UI.renderGrid();
        
        // 4. 게임 로직 시작 (핸드 채우기)
        Flow.checkHandAndRefill();
        UI.updateUI();
    });
};

window.onload = () => {
    // 오디오 파일 미리 로드는 하되, 재생은 안 함
    AudioMgr.init();
    AudioMgr.setupGlobalClicks();

    // 저장된 설정 로드
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    UI.updateUI();

    // 저장 버튼 이벤트들...
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
