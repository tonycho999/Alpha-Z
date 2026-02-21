import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// 글로벌 함수 연결
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => Logic.useRefresh(() => Flow.checkHandAndRefill()),
    useHammer: () => Logic.useHammer(),
    useUpgrade: () => Logic.useUpgrade(),
    tryReviveWithAd: () => {
        AdManager.showRewardAd(() => {
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
            UI.renderGrid();
            Flow.checkHandAndRefill();
        });
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
        
        // 버튼 소리 전역 바인딩
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
                // 난이도가 같을 때만 이어하기
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    // [중요] 저장된 currentMax 로드
                    state.currentMax = loaded.currentMax || 'A'; 
                    if(loaded.items) state.items = loaded.items;
                    console.log("Resume");
                    resumed = true;
                }
            } catch(e) { console.error(e); }
        }
        
        if (!resumed) {
            // [중요] 새 게임: 반드시 currentMax를 A로 리셋해야 함
            state.currentMax = 'A';
            state.hand = [null, null, null];
            Flow.checkHandAndRefill();
        } else {
            UI.renderHand();
            UI.setupDrag(Flow.handleDropAttempt);
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.renderGrid();
        UI.updateUI();

    } catch (e) {
        console.error("Init Fail:", e);
        // 에러 시 강제 초기화
        initGridSize('NORMAL');
        UI.renderGrid();
        state.hand = [null, null, null];
        state.currentMax = 'A'; 
        Flow.checkHandAndRefill();
    }
};
