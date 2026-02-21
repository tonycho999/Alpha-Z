import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML 버튼에서 호출할 함수 전역 등록
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => {
        if(state.items.refresh > 0) {
            state.items.refresh--; 
            Logic.buyItem('refresh', 0); // 개수 차감 후 저장 (가격 0원 꼼수)
            Flow.checkHandAndRefill(); 
            UI.updateUI();
        } else alert("No Refresh item!");
    },
    useHammer: () => {
        if(state.items.hammer > 0) {
            state.items.hammer--; 
            Logic.buyItem('hammer', 0);
            state.isHammerMode = true;
            document.getElementById('grid-container').classList.add('hammer-mode');
            alert("Click a block to remove!"); 
            UI.updateUI();
        } else alert("No Hammer item!");
    },
    useUpgrade: () => {
        if(state.items.upgrade > 0) {
            state.items.upgrade--; 
            Logic.buyItem('upgrade', 0);
            state.grid.forEach((char, i) => {
                if(char) state.grid[i] = state.ALPHABET[state.ALPHABET.indexOf(char)+1] || char;
            });
            UI.renderGrid(); UI.updateUI();
        } else alert("No Upgrade item!");
    },
    tryReviveWithAd: () => { /* 광고 로직 */ },
    saveScore: async () => {
        const nameInput = document.getElementById('username-input');
        const name = nameInput ? nameInput.value : localStorage.getItem('alpha_username');
        if(!name) { alert("Please enter a name"); return; }
        
        const res = await Core.saveScoreToDB(name, !!nameInput); // 신규 유저 여부
        if(res.success) {
            document.getElementById('save-msg').style.display = 'block';
            document.getElementById('btn-check-save').style.display = 'none';
            document.getElementById('btn-just-save').style.display = 'none';
            localStorage.setItem('alpha_username', name);
        } else {
            alert(res.msg);
        }
    }
};

window.onload = () => {
    try {
        console.log("🚀 Game Init");
        
        // [소리] 전역 클릭 리스너 (버튼 소리 해결)
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        // 1. 데이터 로드
        if(localStorage.getItem('alpha_stars')) state.stars = parseInt(localStorage.getItem('alpha_stars'));
        if(localStorage.getItem('alpha_items')) state.items = JSON.parse(localStorage.getItem('alpha_items'));
        if(localStorage.getItem('alpha_best')) state.best = localStorage.getItem('alpha_best');

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        initGridSize(diff); 

        // 2. [이어하기] 저장된 상태 로드
        const savedGame = localStorage.getItem('alpha_gamestate');
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
                    console.log("Resume Game");
                } else {
                    Flow.checkHandAndRefill(); 
                }
            } catch(e) { 
                Flow.checkHandAndRefill(); 
            }
        } else {
            Flow.checkHandAndRefill();
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.updateUI(); // UI 최초 렌더링

    } catch (e) {
        console.error("Critical Init Error:", e);
        // 에러 발생 시 강제 게임 시작 (빈 화면 방지)
        initGridSize('NORMAL');
        UI.renderGrid();
        Flow.checkHandAndRefill();
    }
};
