import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// 전역 객체 등록
window.gameLogic = {
    ...Flow,
    ...Logic,
    ...Core,
    useRefresh: () => {
        if(state.items.refresh > 0) {
            state.items.refresh--;
            Logic.buyItem('refresh', 0); // 개수 저장용 트릭 (가격0 재구매=저장)
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
            // 전체 블록 승급 로직
            state.grid.forEach((char, i) => {
                if(char) {
                    let next = state.ALPHABET[state.ALPHABET.indexOf(char)+1] || char;
                    state.grid[i] = next;
                }
            });
            UI.renderGrid(); UI.updateUI();
        } else alert("No Upgrade item!");
    },
    tryReviveWithAd: () => {}
};

window.onload = () => {
    try {
        console.log("🚀 Game Init");

        // [소리] 전역 버튼 사운드 (button.mp3)
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) {
                AudioMgr.play('button'); // assets/button.mp3 재생
            }
        });

        // 1. 기본 데이터 로드
        const savedStars = localStorage.getItem('alpha_stars');
        if(savedStars) state.stars = parseInt(savedStars);
        
        const savedItems = localStorage.getItem('alpha_items');
        if(savedItems) state.items = JSON.parse(savedItems);
        else state.items = { refresh:0, hammer:0, upgrade:0 };

        const savedBest = localStorage.getItem('alpha_best');
        if(savedBest) state.best = savedBest;

        // 2. 파라미터 확인
        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        // 3. [이어하기 기능] 저장된 게임 상태 확인
        const savedGame = localStorage.getItem('alpha_gamestate');
        
        // 난이도별 그리드 초기화
        initGridSize(diff); 

        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                // 난이도가 같을 때만 이어하기
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    console.log("Resume Game");
                } else {
                    // 난이도 다르면 새 게임
                    Flow.checkHandAndRefill(); 
                }
            } catch(e) {
                console.error("Load Failed", e);
                Flow.checkHandAndRefill();
            }
        } else {
            Flow.checkHandAndRefill(); // 새 게임
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.updateUI(); // 화면 그리기

    } catch (e) {
        console.error("Critical Init Error:", e);
        // 에러 나도 빈 화면 안 뜨게 강제 실행
        initGridSize('NORMAL');
        UI.renderGrid();
        Flow.checkHandAndRefill();
    }
};
