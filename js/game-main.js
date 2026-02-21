import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML 호출용 전역 등록
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => {
        if(state.items.refresh > 0) {
            state.items.refresh--; 
            Logic.buyItem('refresh', 0); // 사용 즉시 저장 (가격 0원)
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
    tryReviveWithAd: () => { /* 광고 후 부활 로직 */ },
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
        
        // 전역 클릭 소리 (HTML에 onclick 없어도 동작하게 보조)
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        // 데이터 로드 확인
        const savedItems = localStorage.getItem('alpha_items');
        if(savedItems) state.items = JSON.parse(savedItems);

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        initGridSize(diff); 

        // [이어하기 로직]
        const savedGame = localStorage.getItem('alpha_gamestate');
        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    console.log("Resume");
                } else Flow.checkHandAndRefill(); 
            } catch(e) { Flow.checkHandAndRefill(); }
        } else {
            Flow.checkHandAndRefill();
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.updateUI(); // 화면 표시

    } catch (e) {
        console.error("Init Fail:", e);
        // 에러 시 강제 실행 (빈 화면 방지)
        initGridSize('NORMAL');
        UI.renderGrid();
        Flow.checkHandAndRefill();
    }
};
