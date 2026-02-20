import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

window.onload = () => {
    // 1. 오디오 초기화
    AudioMgr.init();
    
    // [추가] 모든 버튼 클릭 시 소리나게 설정
    AudioMgr.setupGlobalClicks();

    // 브라우저 오디오 정책 해결 (첫 클릭 시 오디오 잠금 해제)
    const unlockAudio = () => {
        const dummy = new Audio();
        dummy.play().catch(() => {});
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // 사운드 버튼 연결
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    // 2. 난이도 및 초기 설정
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    const uiDiff = document.getElementById('ui-diff');
    if(uiDiff) uiDiff.textContent = state.diff;
    
    initGridSize(state.diff);
    
    // 3. 어드민 및 스타 로드
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    // 4. 그리드 생성
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => Flow.handleCellClick(i);
        container.appendChild(div);
    }

    // 5. 게임 시작
    state.nextBlock = Core.createRandomBlock();
    Flow.nextTurn();
    UI.updateUI();

    // 6. 저장 버튼 이벤트 리스너 (신규/기존 유저)
    const btnCheckSave = document.getElementById('btn-check-save');
    if (btnCheckSave) {
        btnCheckSave.onclick = async () => {
            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            
            if(!name) return alert('Enter username!');
            checkAdmin(name);
            
            // true: 신규 유저 모드 (중복 체크)
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
            // false: 기존 유저 모드 (덮어쓰기 허용)
            Core.saveScoreToDB(localStorage.getItem('alpha_username'), false);
            document.getElementById('area-exist-user').style.display='none';
            document.getElementById('save-msg').style.display='block';
        };
    }
};
