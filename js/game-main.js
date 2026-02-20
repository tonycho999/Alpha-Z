import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [핵심] 게임 시작 함수를 window 객체에 등록 (HTML에서 호출 가능하게)
window.initGame = (diff) => {
    // 1. 난이도 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // 2. 그리드 생성
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => Flow.handleCellClick(i);
        container.appendChild(div);
    }

    // 3. 게임 시작 (핸드 채우기)
    Flow.checkHandAndRefill();
    UI.updateUI();
};

window.onload = () => {
    // 1. 오디오 초기화
    AudioMgr.init();
    AudioMgr.setupGlobalClicks();

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

    // 2. 스타 및 어드민 로드
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    // UI 업데이트 (별 개수 등)
    UI.updateUI();

    // [중요] 게임은 여기서 바로 시작하지 않음! 
    // HTML의 버튼(startGame)을 눌러야 window.initGame()이 호출되어 시작됨.

    // 3. 저장 버튼 이벤트
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
