import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js"; // [중요] 분리된 로직 가져오기
import { AudioMgr } from "./game-audio.js";

// 1. 셀 클릭 처리 (망치 모드 등)
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
        
        // 망치 사용 후 핸드 리필 체크
        checkHandAndRefill();
    }
}

// 2. 핸드 확인 및 리필 (턴 관리)
export function checkHandAndRefill() {
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        state.hand = [
            Core.createRandomBlock(),
            Core.createRandomBlock(),
            Core.createRandomBlock()
        ];
        UI.renderHand();
        UI.setupDrag(handleDropAttempt); 
        checkGameOver();
    } else {
        checkGameOver();
    }
}

// 3. 게임 오버 체크
function checkGameOver() {
    let canPlace = false;
    
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            if (Core.canPlaceAnywhere(state.hand[i])) {
                canPlace = true;
                break;
            }
        }
    }

    if (!canPlace) {
        AudioMgr.play('over');
        showGameOverPopup();
    }
}

// 4. 게임 오버 팝업 표시 및 광고 부활 연결
function showGameOverPopup() {
    const popup = document.getElementById('popup-over');
    if(popup) popup.style.display = 'flex';
    
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
    
    // 광고 보고 부활하기
    const btnRevive = document.getElementById('btn-revive-ad');
    if(btnRevive) {
        if(state.hasRevived) {
            btnRevive.style.display = 'none';
        } else {
            btnRevive.style.display = 'block';
            btnRevive.onclick = () => {
                AdManager.showRewardAd(() => {
                    state.hasRevived = true;
                    state.isReviveTurn = true;
                    
                    // 중앙 비우기
                    const center = Math.floor(state.gridSize/2);
                    for(let r=center-1; r<=center+1; r++){
                        for(let c=center-1; c<=center+1; c++){
                            const idx = r*state.gridSize+c;
                            if(idx >= 0 && idx < state.grid.length) state.grid[idx] = null;
                        }
                    }
                    if(popup) popup.style.display = 'none';
                    UI.renderGrid();
                    checkHandAndRefill();
                });
            };
        }
    }

    // 유저 UI 처리
    const name = localStorage.getItem('alpha_username');
    const existArea = document.getElementById('area-exist-user');
    const newArea = document.getElementById('area-new-user');
    
    if(name) {
         if(existArea) { existArea.style.display = 'block'; document.getElementById('user-badge').textContent = name; }
         if(newArea) newArea.style.display = 'none';
    } else {
         if(existArea) existArea.style.display = 'none';
         if(newArea) newArea.style.display = 'block';
    }
}

export function nextTurn() {
    checkHandAndRefill();
}

// 5. 드롭 시도 처리 (UI에서 호출됨)
export function handleDropAttempt(targetIdx, isPreview) {
    if(state.dragIndex === -1) return false;
    const block = state.hand[state.dragIndex];
    if (!block) return false;

    const size = state.gridSize;
    const r = Math.floor(targetIdx / size);
    const c = targetIdx % size;
    const shape = block.shape;
    let finalIndices = [];
    let possible = true;
    
    for (let i = 0; i < shape.map.length; i++) {
        const tr = r + shape.map[i][0];
        const tc = c + shape.map[i][1];
        const tidx = tr * size + tc;

        if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { 
            possible = false; 
            break; 
        }
        finalIndices.push(tidx);
    }

    if (!possible) return false;

    if(isPreview) {
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });
        return true;
    } else {
        // [중요] 실제 로직은 game-logic.js의 함수 호출
        // 콜백으로 checkHandAndRefill을 넘겨서, 로직이 다 끝난 후 실행되게 함
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
