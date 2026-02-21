import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => Logic.useRefresh(() => Flow.checkHandAndRefill()),
    useHammer: () => Logic.useHammer(),
    useUpgrade: () => Logic.useUpgrade(),
    tryReviveWithAd: () => {
        // game-flow.js의 클릭 이벤트에서 AdManager.showRewardAd를 이미 호출했으므로
        // 여기서는 성공 시의 콜백 로직만 수행하면 됩니다.
        // 하지만 game-flow에서 직접 호출하는 구조로 되어 있으므로 이중 호출 방지를 위해 로직 유지
        
        // (game-flow.js에서 호출할 때 이미 광고를 봤다고 가정하고 내부 로직 실행)
        state.hasRevived = true;
        
        // 중앙 3x3 비우기
        const center = Math.floor(state.gridSize/2);
        for(let r=center-1; r<=center+1; r++){
            for(let c=center-1; c<=center+1; c++){
                const idx = r*state.gridSize+c;
                if(idx>=0 && idx<state.grid.length) state.grid[idx] = null;
            }
        }
        document.getElementById('popup-over').style.display = 'none';
        
        // [중요] 부활했으므로 게임 상태 다시 저장 (점수 유지)
        Logic.saveGameState();
        
        UI.renderGrid();
        Flow.checkHandAndRefill();
    },
    saveScore: async () => {
        const nameInput = document.getElementById('username-input');
        const name = nameInput ? nameInput.value : localStorage.getItem('alpha_username');
        if(!name) { alert("Enter Name"); return; }
        
        const res = await Core.saveScoreToDB(name, !!nameInput);
        if(res.success) {
            document.getElementById('save-msg').style.display = 'block';
            document.getElementById('btn-check-save').style.display = 'none';
            document.getElementById('btn-just-save').style.display = 'none';
            localStorage.setItem('alpha_username', name);
        } else alert(res.msg);
    }
};

window.onload = () => {
    try {
        console.log("🚀 Game Start");
        
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        // 1. 기본 데이터 로드
        if(localStorage.getItem('alpha_stars')) state.stars = parseInt(localStorage.getItem('alpha_stars'));
        if(localStorage.getItem('alpha_items')) state.items = JSON.parse(localStorage.getItem('alpha_items'));
        if(localStorage.getItem('alpha_best')) state.best = localStorage.getItem('alpha_best');

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        initGridSize(diff); 

        // 2. 이어하기 체크
        const savedGame = localStorage.getItem('alpha_gamestate');
        let resumed = false;
        
        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    state.currentMax = loaded.currentMax || 'A'; 
                    if(loaded.items) state.items = loaded.items;
                    console.log("Resume");
                    resumed = true;
                }
            } catch(e) { console.error(e); }
        }
        
        if (!resumed) {
            // [중요] 새 게임 시작 시 초기화
            console.log("New Game Started");
            state.score = 0; // 점수 0점
            state.currentMax = 'A';
            state.hand = [null, null, null];
            
            // 혹시 남아있을지 모를 점수 기록 삭제
            localStorage.removeItem('alpha_score');
            
            Flow.checkHandAndRefill();
        } else {
            UI.renderHand();
            UI.setupDrag(Flow.handleDropAttempt);
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.renderGrid();
        UI.updateUI(); // 0점 반영

    } catch (e) {
        console.error("Init Fail:", e);
        initGridSize('NORMAL');
        UI.renderGrid();
        state.score = 0;
        state.hand = [null, null, null];
        state.currentMax = 'A'; 
        Flow.checkHandAndRefill();
        UI.updateUI();
    }
};
