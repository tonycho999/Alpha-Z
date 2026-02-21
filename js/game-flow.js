import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// 1. 셀 클릭
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
        checkHandAndRefill();
    }
}

// 2. 핸드 리필
export function checkHandAndRefill() {
    const isEmpty = state.hand.every(b => b === null);
    if (isEmpty) {
        state.hand = [ Core.createRandomBlock(), Core.createRandomBlock(), Core.createRandomBlock() ];
        UI.renderHand();
        UI.setupDrag(handleDropAttempt); 
        checkGameOver();
    } else {
        checkGameOver();
    }
}

// 3. 게임 오버
function checkGameOver() {
    let canPlace = false;
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            if (Core.canPlaceAnywhere(state.hand[i])) { canPlace = true; break; }
        }
    }
    if (!canPlace) {
        AudioMgr.play('over');
        showGameOverPopup();
    }
}

function showGameOverPopup() {
    const popup = document.getElementById('popup-over');
    if(popup) popup.style.display = 'flex';
    document.getElementById('over-best').textContent = state.best;
    
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
    // 유저 UI
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

export function nextTurn() { checkHandAndRefill(); }

// 4. 드롭 시도 (미리보기 포함)
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
            possible = false; break; 
        }
        finalIndices.push(tidx);
    }

    if (!possible) return false;

    if(isPreview) {
        // [1] 배치 가능 하이라이트
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });

        // [2] 합체 예측 시각화 (will-merge)
        // 내가 놓을 블록들의 문자들을 확인
        block.items.forEach((char, idx) => {
            const myIdx = finalIndices[idx]; // 내가 놓일 자리
            
            // 상하좌우 탐색
            const neighbors = [myIdx-1, myIdx+1, myIdx-size, myIdx+size];
            neighbors.forEach(n => {
                if (n >= 0 && n < size*size) {
                    // 좌우 경계 검사
                    if (Math.abs((n % size) - (myIdx % size)) > 1) return;

                    // 주변에 같은 문자가 있으면 합체 가능성!
                    if (state.grid[n] === char) {
                        const neighborEl = document.getElementById(`cell-${n}`);
                        const myEl = document.getElementById(`cell-${myIdx}`);
                        
                        // 주변 블록과 내 자리에 반짝임 효과 추가
                        if(neighborEl) neighborEl.classList.add('will-merge');
                        if(myEl) myEl.classList.add('will-merge');
                    }
                }
            });
        });

        return true;
    } else {
        // 실제 드롭
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
