import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

window.onload = () => {
    // 1. 오디오 초기화
    AudioMgr.init();
    AudioMgr.setupGlobalClicks();

    // 브라우저 오디오 정책 해결
    const unlockAudio = () => {
        const dummy = new Audio();
        dummy.play().catch(() => {});
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    // 2. 난이도 및 데이터 로드
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    const uiDiff = document.getElementById('ui-diff'); // 없으면 무시됨
    if(uiDiff) uiDiff.textContent = state.diff;
    
    initGridSize(state.diff);
    
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    // 3. 그리드 생성
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => Flow.handleCellClick(i);
        container.appendChild(div);
    }

    // 4. [변경] 게임 시작 로직 (3개 블록 생성 모드)
    // 기존: state.nextBlock = ...; Flow.nextTurn();
    // 변경: 핸드 체크 및 리필 함수 호출
    Flow.checkHandAndRefill();
    
    UI.updateUI();

    // 5. 저장 버튼 이벤트
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
