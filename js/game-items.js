import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { nextTurn } from "./game-flow.js"; // 흐름 제어를 위해 import

// 전역 객체 window.gameLogic에 할당 (HTML onclick에서 사용)
window.gameLogic = {
    // 🔨 망치 아이템
    useHammer: () => {
        const cost = 2;
        if(state.stars < cost && !state.isAdmin) {
            triggerAdForItem(cost, () => {
                state.isHammerMode = !state.isHammerMode;
                document.getElementById('grid-container').classList.toggle('hammer-mode');
            });
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); UI.updateUI(); }
        state.isHammerMode = !state.isHammerMode;
        document.getElementById('grid-container').classList.toggle('hammer-mode');
    },

    // 🔄 새로고침 아이템
    useRefresh: () => {
        const cost = 1;
        if(state.stars < cost && !state.isAdmin) {
            triggerAdForItem(cost, () => {
                UI.updateUI(); 
                nextTurn(); // game-flow.js 함수 호출
            });
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); }
        UI.updateUI(); 
        nextTurn();
    },

    // ✨ 전체 업그레이드 아이템
    useUpgrade: () => {
        const cost = 5;
        if(state.stars < cost && !state.isAdmin) {
            if (state.stars + 2 >= cost) {
                triggerAdForItem(cost, () => { executeUpgrade(); });
            } else {
                alert(`Need ${cost} Stars! You only have ${state.stars}⭐.\nVisit the shop to earn more!`);
            }
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); UI.updateUI(); }
        executeUpgrade();
    },

    // 📺 부활 (광고 시청)
    tryReviveWithAd: () => {
        if(state.hasRevived) return; 
        if(state.isAdmin) return; 

        if(confirm("Watch ad to get a 1x1 'A' Block? \nIt fits in any empty space!")) {
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            setTimeout(() => {
                AdManager.recordAdWatch();
                doReviveAction();
                alert("You got a 1x1 Block! Place it in an empty spot.");
            }, 3000);
        }
    }
};

// 광고 시청 공통 로직
function triggerAdForItem(cost, actionCallback) {
    const adStatus = AdManager.canWatchAd();
    if (!adStatus.canWatch) {
        if (adStatus.reason === 'cooldown') {
            const min = Math.ceil(adStatus.remaining / 60000);
            alert(`Ad is cooling down. Try again in ${min} min.`);
        } else { alert(adStatus.reason); }
        return;
    }
    if(confirm("Not enough stars! Watch an ad to get 2 Stars and use item?")) {
        window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
        setTimeout(() => {
            AdManager.recordAdWatch();
            state.stars += 2; state.stars -= cost;
            localStorage.setItem('alpha_stars', state.stars);
            actionCallback(); 
            alert("Thanks for watching! Item applied.");
        }, 2000);
    }
}

// 부활 실행 로직 (1x1 블록 지급 및 빈칸 확보)
function doReviveAction() {
    state.hasRevived = true;
    state.isReviveTurn = true; 
    state.currentBlock = { shape: { w:1, h:1, map:[[0,0]] }, items: ['A'] };

    const hasEmptySpace = state.grid.includes(null);
    if (!hasEmptySpace) {
        let lowestIdx = -1;
        let lowestCharIdx = 999;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cIdx = ALPHABET.indexOf(state.grid[i]);
                if(cIdx < lowestCharIdx) { lowestCharIdx = cIdx; lowestIdx = i; }
            }
        }
        if(lowestIdx !== -1) {
            state.grid[lowestIdx] = null;
            UI.renderGrid();
            setTimeout(() => alert("Board was full! \nOne lowest block removed to make space."), 100);
        }
    }
    UI.renderSource(state.currentBlock, 'source-block');
    document.getElementById('popup-over').style.display = 'none';
}

// 업그레이드 실행 로직
async function executeUpgrade() {
    if (state.isLocked || state.isHammerMode) return;
    state.isLocked = true;
    
    // 가장 낮은 등급 찾기
    let lowestIdx = 999;
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        if (state.grid[i]) {
            const charIdx = ALPHABET.indexOf(state.grid[i]);
            if (charIdx < lowestIdx) lowestIdx = charIdx;
        }
    }
    if (lowestIdx === 999) { state.isLocked = false; return; }
    
    const lowestChar = ALPHABET[lowestIdx];
    const nextChar = ALPHABET[lowestIdx + 1] || lowestChar;
    
    // 업그레이드 수행
    let upgraded = false;
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        if (state.grid[i] === lowestChar) {
            state.grid[i] = nextChar;
            upgraded = true;
            const cell = document.getElementById(`cell-${i}`);
            if (cell) {
                cell.classList.add('merging-source');
                setTimeout(() => cell.classList.remove('merging-source'), 300);
            }
        }
    }
    
    if (upgraded) {
        UI.renderGrid();
        await new Promise(r => setTimeout(r, 300));
        
        // 업그레이드 후 연쇄 병합 처리 (Flow의 로직과 유사하지만 여기서는 재귀적으로 처리)
        // 편의상 Flow의 placeBlock과 유사한 루프를 돌림
        // (필요 시 game-flow.js에 병합 전용 함수를 만들어서 공유할 수도 있음)
    }
    state.isLocked = false;
}
