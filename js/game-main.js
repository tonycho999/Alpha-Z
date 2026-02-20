import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; // [추가]

window.onload = () => {
    // 1. 오디오 초기화 [추가]
    AudioMgr.init();

    // 2. 사운드 버튼 연결 [추가]
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    // 3. 기존 로직들
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    document.getElementById('ui-diff').textContent = state.diff;
    
    initGridSize(state.diff);
    
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => Flow.handleCellClick(i);
        container.appendChild(div);
    }

    state.nextBlock = Core.createRandomBlock();
    Flow.nextTurn();
    UI.updateUI();

    document.getElementById('btn-check-save').onclick = async () => {
        const name = document.getElementById('username-input').value.trim();
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

    document.getElementById('btn-just-save').onclick = () => {
        Core.saveScoreToDB(localStorage.getItem('alpha_username'), false);
        document.getElementById('area-exist-user').style.display='none';
        document.getElementById('save-msg').style.display='block';
    };
};
