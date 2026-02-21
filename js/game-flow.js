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
        UI.renderGrid(); UI.updateUI();
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
        Logic.saveGameState(); // 새 핸드 저장
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
    const isHandEmpty = state.hand.every(b => b === null);
    if (!canPlace && !isHandEmpty) {
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
        // [수정] 광고 시청 가능 여부 확인
        const adStatus = AdManager.checkAdStatus();
        
        // 이미 부활했거나, 관리자이거나, 광고를 볼 수 없는 상태면 버튼 숨김/변경
        if(state.hasRevived) {
            btnRevive.style.display = 'none';
        } else if (state.isAdmin) {
            btnRevive.style.display = 'none'; // 관리자는 부활 버튼 안 봄 (요청사항)
        } else if (!adStatus.avail) {
            // 쿨타임 중이면 버튼 비활성화 및 메시지 표시
            btnRevive.style.display = 'block';
            btnRevive.disabled = true;
            btnRevive.style.opacity = '0.5';
            btnRevive.textContent = `🚫 ${adStatus.msg}`;
        } else {
            // 시청 가능
            btnRevive.style.display = 'block';
            btnRevive.disabled = false;
            btnRevive.style.opacity = '1';
            btnRevive.textContent = "📺 Revive (Get 1x1 Block)";
            btnRevive.onclick = () => {
                AdManager.showRewardAd(() => {
                    state.hasRevived = true;
                    state.isReviveTurn = true;
                    // 중앙 3x3 비우기
                    const center = Math.floor(state.gridSize/2);
                    for(let r=center-1; r<=center+1; r++){
                        for(let c=center-1; c<=center+1; c++){
                            const idx = r*state.gridSize+c;
                            if(idx>=0 && idx<state.grid.length) state.grid[idx] = null;
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

// 4. 드롭 시도 (하이라이트 유지)
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
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });

        // 합체 예측
        block.items.forEach((char, idx) => {
            const myIdx = finalIndices[idx];
            const neighbors = [myIdx-1, myIdx+1, myIdx-size, myIdx+size];
            neighbors.forEach(n => {
                if (n >= 0 && n < size*size) {
                    if (Math.abs((n % size) - (myIdx % size)) > 1) return;
                    if (state.grid[n] === char) {
                        const neighborEl = document.getElementById(`cell-${n}`);
                        const myEl = document.getElementById(`cell-${myIdx}`);
                        if(neighborEl) neighborEl.classList.add('will-merge');
                        if(myEl) myEl.classList.add('will-merge');
                    }
                }
            });
        });
        return true;
    } else {
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
