import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML에서 접근할 수 있도록 전역 객체에 연결
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    
    // [수정] 새로고침
    useRefresh: () => Logic.useRefresh(() => {
        state.hand = [null, null, null];
        Flow.checkHandAndRefill();
        UI.renderHand();
        UI.setupDrag(Flow.handleDropAttempt); 
    }),

    useHammer: () => Logic.useHammer(),

    // [수정] 업그레이드
    useUpgrade: async () => {
        await Logic.useUpgrade();
    },

    // [수정] 메뉴 버튼
    quitGame: () => {
        const popup = document.getElementById('popup-exit');
        if(popup) popup.style.display = 'flex';
    },

    // [신규] 팝업 닫기
    closeExitPopup: () => {
        const popup = document.getElementById('popup-exit');
        if(popup) popup.style.display = 'none';
    },

    // [신규] 진짜 종료
    confirmExit: () => {
        localStorage.removeItem('alpha_gamestate'); 
        location.href = '/';
    },

    // [신규] 알림 팝업
    showNotice: (title, msg) => {
        const popup = document.getElementById('popup-notice');
        const t = document.getElementById('notice-title');
        const m = document.getElementById('notice-msg');
        
        if(popup && t && m) {
            t.textContent = title;
            m.textContent = msg;
            popup.style.display = 'flex';
        }
    },

    closeNoticePopup: () => {
        const popup = document.getElementById('popup-notice');
        if(popup) popup.style.display = 'none';
    },

    // [복구됨] 광고 보고 부활하기
    tryReviveWithAd: () => {
        AdManager.showRewardAd(() => {
            state.hasRevived = true;
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
            UI.updateUI();
        });
    },

    // 점수 저장
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

// [수정됨] window.onload (PWA 버튼 로직 추가)
window.onload = async () => {
    try {
        console.log("🚀 Game Start");

        // 1. 광고 매니저 초기화
        await AdManager.init(); 

        // 2. [중요] 플랫폼이 'GENERIC'(일반 웹)일 때만 설치 버튼 표시 시도
        if (AdManager.platform === 'GENERIC') {
            setTimeout(() => {
                const btn = document.getElementById('btn-install');
                // 이미 앱으로 실행 중이 아니면 버튼 표시
                if (btn && !window.matchMedia('(display-mode: standalone)').matches) {
                    btn.classList.remove('hidden');
                }
            }, 1000);
        }

        // ... 기존 초기화 로직 ...
        const params = new URLSearchParams(window.location.search);
        let diffParam = params.get('diff') || 'NORMAL';
        state.diff = diffParam.toUpperCase(); 
        
        initGridSize(state.diff); 

        const savedBest = localStorage.getItem(`alpha_best_${state.diff}`);
        state.best = savedBest || 'A';

        const savedGame = localStorage.getItem('alpha_gamestate');
        let resumed = false;
        
        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                if(loaded.diff === state.diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    state.currentMax = loaded.currentMax || 'A'; 
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
            localStorage.removeItem('alpha_score');
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
