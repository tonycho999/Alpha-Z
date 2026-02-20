import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; // 아이템 로직 로드 (window.gameLogic 등록)

window.onload = () => {
    // 1. 난이도 및 초기 설정
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    document.getElementById('ui-diff').textContent = state.diff;
    
    initGridSize(state.diff);
    
    // 2. 어드민 및 스타 로드
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

    // 4. 게임 시작
    state.nextBlock = Core.createRandomBlock();
    Flow.nextTurn();
    UI.updateUI();

    // 5. 저장 버튼 이벤트 리스너 (신규/기존 유저)
    document.getElementById('btn-check-save').onclick = async () => {
        const name = document.getElementById('username-input').value.trim();
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

    document.getElementById('btn-just-save').onclick = () => {
        // false: 기존 유저 모드 (덮어쓰기 허용)
        Core.saveScoreToDB(localStorage.getItem('alpha_username'), false);
        document.getElementById('area-exist-user').style.display='none';
        document.getElementById('save-msg').style.display='block';
    };
};
