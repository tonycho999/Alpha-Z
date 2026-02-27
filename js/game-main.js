import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// HTML에서 접근할 수 있도록 전역 객체에 연결
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    
    // [수정] 새로고침 아이템 사용
    useRefresh: () => Logic.useRefresh(() => {
        state.hand = [null, null, null];
        Flow.checkHandAndRefill();
        UI.renderHand();
        UI.setupDrag(Flow.handleDropAttempt); 
    }),

    useHammer: () => Logic.useHammer(),

    // [수정] 업그레이드 아이템 사용
    useUpgrade: async () => {
        await Logic.useUpgrade();
    },

    // [수정] 메뉴 버튼 (나가기 팝업 열기)
    showExitPopup: () => {
        const popup = document.getElementById('popup-exit');
        if(popup) popup.style.display = 'flex';
    },
    
    // (구버전 호환용)
    quitGame: () => {
        const popup = document.getElementById('popup-exit');
        if(popup) popup.style.display = 'flex';
    },

    // [신규] 나가기 팝업 닫기
    closeExitPopup: () => {
        const popup = document.getElementById('popup-exit');
        if(popup) popup.style.display = 'none';
    },

    // [중요] 진짜 종료 (메인 메뉴로 이동) - 팝업 내 Exit 버튼
    confirmExit: () => {
        // 1. 별, 아이템 등 재화 저장 (resetAndSave 내부에서 처리)
        if(Logic.resetAndSave) Logic.resetAndSave(); 
        
        // 2. 게임 진행 상태 삭제 (다음 실행 시 새 게임)
        localStorage.removeItem('alpha_gamestate'); 
        
        // 3. 메인으로 이동
        location.href = '/';
    },

    // [중요] 게임 오버 화면에서 홈으로 이동 - Main Menu 버튼
    goHome: () => {
        // 1. 재화 저장 및 상태 초기화
        if(Logic.resetAndSave) Logic.resetAndSave();
        
        // 2. 진행 상태 삭제
        localStorage.removeItem('alpha_gamestate');
        
        // 3. 메인으로 이동
        location.href = 'index.html';
    },

    // [신규] 알림 팝업 표시
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

    // [광고] 광고 보고 부활하기
    tryReviveWithAd: () => {
        // AdManager가 존재하는지 확인 후 실행
        if (AdManager && typeof AdManager.showRewardAd === 'function') {
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
                
                // 팝업 닫기 및 상태 갱신
                document.getElementById('popup-over').style.display = 'none';
                Logic.saveGameState();
                UI.renderGrid();
                Flow.checkHandAndRefill();
                UI.updateUI();
            });
        } else {
            alert("Ad functionality is not available.");
        }
    },

    // 점수 저장 (랭킹)
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
            const btnCheck = document.getElementById('btn-check-save');
            const btnJust = document.getElementById('btn-just-save');
            if(btnCheck) btnCheck.style.display = 'none';
            if(btnJust) btnJust.style.display = 'none';
            
            localStorage.setItem('alpha_username', name);
        } else alert(res.msg);
    }
};

window.onload = async () => {
    try {
        console.log("🚀 Game Start");

        // 1. 광고 매니저 초기화
        if (AdManager && AdManager.init) {
            await AdManager.init();
        }

        // [추가] 시작 화면 스타(Stars) 표시 업데이트
        const savedStars = localStorage.getItem('alpha_stars') || 0;
        const starEl = document.getElementById('idx-stars');
        if(starEl) starEl.textContent = savedStars;

        // 2. [설치 버튼] 플랫폼 확인
        if (AdManager && AdManager.platform === 'GENERIC') {
            setTimeout(() => {
                const btn = document.getElementById('btn-install');
                if (btn && !window.matchMedia('(display-mode: standalone)').matches) {
                    btn.classList.remove('hidden');
                }
            }, 1000);
        }

        // 3. [QR 코드 & 인트로] 로직
        const introPopup = document.getElementById('intro-popup');
        if (introPopup) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const dontShow = localStorage.getItem('alpha_intro_done');
            const pcContent = document.getElementById('intro-pc');
            const mobileContent = document.getElementById('intro-mobile');

            if (!dontShow) {
                if (isMobile) {
                    if(mobileContent) mobileContent.style.display = 'block';
                    if(pcContent) pcContent.style.display = 'none';
                    introPopup.style.display = 'flex';
                } else {
                    if(mobileContent) mobileContent.style.display = 'none';
                    
                    // 플랫폼이 일반 웹(GENERIC)일 때만 QR 코드 표시
                    if (AdManager && AdManager.platform === 'GENERIC') {
                        if(pcContent) pcContent.style.display = 'block';
                    } else {
                        if(pcContent) pcContent.style.display = 'none';
                    }
                    introPopup.style.display = 'flex';
                }
            }
        }

        // ... 게임 초기화 로직 ...
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
        
        // 재개할 게임이 없으면 새 게임 시작
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
        // 에러 시 안전하게 초기화
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
