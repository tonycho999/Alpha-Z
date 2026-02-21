import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML 버튼 연결
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => {
        if(state.items.refresh > 0) {
            state.items.refresh--; Logic.buyItem('refresh', 0); // 사용 즉시 저장
            Flow.checkHandAndRefill(); UI.updateUI();
        } else alert("No Refresh item!");
    },
    useHammer: () => {
        if(state.items.hammer > 0) {
            state.items.hammer--; Logic.buyItem('hammer', 0);
            state.isHammerMode = true;
            document.getElementById('grid-container').classList.add('hammer-mode');
            alert("Click a block to remove!"); UI.updateUI();
        } else alert("No Hammer item!");
    },
    useUpgrade: () => {
        if(state.items.upgrade > 0) {
            state.items.upgrade--; Logic.buyItem('upgrade', 0);
            state.grid.forEach((char, i) => {
                if(char) state.grid[i] = state.ALPHABET[state.ALPHABET.indexOf(char)+1] || char;
            });
            UI.renderGrid(); UI.updateUI();
        } else alert("No Upgrade item!");
    },
    tryReviveWithAd: () => {}
};

window.onload = () => {
    try {
        console.log("🚀 Game Init");
        
        // [소리] 전역 버튼 클릭음
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        // 1. 데이터 로드
        const savedStars = localStorage.getItem('alpha_stars');
        if(savedStars) state.stars = parseInt(savedStars);
        
        const savedItems = localStorage.getItem('alpha_items');
        if(savedItems) state.items = JSON.parse(savedItems);
        else state.items = { refresh:0, hammer:0, upgrade:0 };

        const savedBest = localStorage.getItem('alpha_best');
        if(savedBest) state.best = savedBest;

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        // 2. [이어하기] 저장된 상태 확인
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
                    console.log("Resume Game");
                } else Flow.checkHandAndRefill(); 
            } catch(e) { Flow.checkHandAndRefill(); }
        } else {
            Flow.checkHandAndRefill();
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.updateUI();

    } catch (e) {
        console.error("Critical Init Error:", e);
        // 에러 발생 시 강제 시작 (빈 화면 방지)
        initGridSize('NORMAL');
        UI.renderGrid();
        Flow.checkHandAndRefill();
    }
};
