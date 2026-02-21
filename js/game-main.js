import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// [중요] HTML 버튼과 연결되는 전역 함수 등록
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => Logic.useRefresh(() => Flow.checkHandAndRefill()),
    useHammer: () => Logic.useHammer(),
    useUpgrade: () => Logic.useUpgrade(),
    tryReviveWithAd: () => {
        AdManager.showRewardAd(() => {
            // 부활 로직: 중앙 3x3 비우기
            state.hasRevived = true;
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
        
        // 전역 클릭 소리 (보조)
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        // [이어하기 로직]
        const savedGame = localStorage.getItem('alpha_gamestate');
        initGridSize(diff); 

        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    if(loaded.items) state.items = loaded.items;
                    console.log("Resume");
                } else Flow.checkHandAndRefill(); 
            } catch(e) { Flow.checkHandAndRefill(); }
        } else {
            Flow.checkHandAndRefill();
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.updateUI(); // UI 최초 그리기

    } catch (e) {
        console.error("Init Fail:", e);
        // 에러 시 강제 실행 (빈 화면 방지)
        initGridSize('NORMAL');
        UI.renderGrid();
        Flow.checkHandAndRefill();
    }
};
