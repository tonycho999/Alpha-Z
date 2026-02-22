import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML에서 접근할 수 있도록 전역 객체에 연결
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => Logic.useRefresh(() => Flow.checkHandAndRefill()),
    useHammer: () => Logic.useHammer(),
    useUpgrade: () => Logic.useUpgrade(),
    
    // 광고 보고 부활하기 기능
    tryReviveWithAd: () => {
        AdManager.showRewardAd(() => {
            state.hasRevived = true;
            // 중앙 3x3 영역 비우기
            const center = Math.floor(state.gridSize/2);
            for(let r=center-1; r<=center+1; r++){
                for(let c=center-1; c<=center+1; c++){
                    const idx = r*state.gridSize+c;
                    if(idx>=0 && idx<state.grid.length) state.grid[idx] = null;
                }
            }
            document.getElementById('popup-over').style.display = 'none';
            Logic.saveGameState();
            UI.renderGrid();
            Flow.checkHandAndRefill();
            UI.updateUI(); // 부활 후 UI 갱신
        });
    },

    // 점수 저장 (이름 입력)
    saveScore: async () => {
        const nameInput = document.getElementById('username-input');
        let name = '';
        if (nameInput && nameInput.value.trim()) {
            name = nameInput.value.trim();
        } else {
            name = localStorage.getItem('alpha_username');
        }

        if(!name) { alert("Enter Name"); return; }
        
        const res = await Core.saveScoreToDB(name, state.diff, !!(nameInput && nameInput.value));
        
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
        
        // [수정 1] 소리 중복 재생 방지를 위해 전역 클릭 리스너 삭제 (HTML onclick 사용)
        
        // [수정 2] 아이템 불러오기 코드 삭제 (game-data.js에서 이미 safeLoad로 불러옴)
        // 중복 로딩 시 오류가 발생할 수 있으므로 제거하는 것이 안전함.

        // URL 파라미터 처리 (난이도 확정)
        const params = new URLSearchParams(window.location.search);
        let diffParam = params.get('diff') || 'NORMAL';
        state.diff = diffParam.toUpperCase(); 
        
        // 그리드 크기 및 배열 초기화
        initGridSize(state.diff); 

        // 해당 난이도의 BEST 기록 불러오기
        const savedBest = localStorage.getItem(`alpha_best_${state.diff}`);
        state.best = savedBest || 'A';

        // 저장된 게임 이어하기 체크
        const savedGame = localStorage.getItem('alpha_gamestate');
        let resumed = false;
        
        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                // 저장된 게임의 난이도가 현재 난이도와 같을 때만 불러옴
                if(loaded.diff === state.diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    state.currentMax = loaded.currentMax || 'A'; 
                    
                    // 아이템도 불러오되, 없으면 기존 state.items 유지
                    if(loaded.items) state.items = loaded.items;
                    
                    console.log("Resume Game");
                    resumed = true;
                }
            } catch(e) { console.error(e); }
        }
        
        if (!resumed) {
            console.log(`New Game: ${state.diff}`);
            state.score = 0;
            state.currentMax = 'A';
            state.hand = [null, null, null];
            // 새 게임이지만, 아이템 개수는 유지해야 하므로 items 초기화는 하지 않음!
            localStorage.removeItem('alpha_score');
            Flow.checkHandAndRefill();
        } else {
            UI.renderHand();
            UI.setupDrag(Flow.handleDropAttempt);
        }

        // 관리자 권한 확인
        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        // 화면 그리기
        UI.renderGrid();
        
        // [중요] 마지막에 UI 업데이트를 해야 아이템 개수가 표시됨
        UI.updateUI();

    } catch (e) {
        console.error("Init Fail:", e);
        // 에러 발생 시 안전 모드 진입
        state.diff = 'NORMAL';
        initGridSize('NORMAL');
        UI.renderGrid();
        state.score = 0;
        state.hand = [null, null, null];
        state.currentMax = 'A'; 
        Flow.checkHandAndRefill();
        UI.updateUI();
    }
};
