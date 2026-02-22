import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); UI.updateUI();
        checkHandAndRefill();
    }
}

export function checkHandAndRefill() {
    const isEmpty = state.hand.every(b => b === null);
    if (isEmpty) {
        state.hand = [ Core.createRandomBlock(), Core.createRandomBlock(), Core.createRandomBlock() ];
        UI.renderHand();
        UI.setupDrag(handleDropAttempt); 
        Logic.saveGameState(); 
        checkGameOver();
    } else {
        checkGameOver();
    }
}

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
    localStorage.removeItem('alpha_gamestate');
    localStorage.removeItem('alpha_score');

    const popup = document.getElementById('popup-over');
    if(popup) popup.style.display = 'flex';
    document.getElementById('over-best').textContent = state.best;
    
    const saveMsg = document.getElementById('save-msg');
    if(saveMsg) saveMsg.style.display = 'none';

    // 1. 부활 버튼
    const btnRevive = document.getElementById('btn-revive-ad');
    if(btnRevive) {
        const adStatus = AdManager.checkAdStatus();
        if(state.hasRevived) {
             btnRevive.style.display = 'none';
        } else if (!adStatus.avail && !state.isAdmin) {
             btnRevive.style.display = 'block';
             btnRevive.disabled = true;
             btnRevive.style.opacity = '0.5';
             btnRevive.textContent = `🚫 ${adStatus.msg}`;
        } else {
            btnRevive.style.display = 'block';
            btnRevive.disabled = false;
            btnRevive.style.opacity = '1';
            btnRevive.textContent = "📺 Revive (Get 1x1 Block)";
            btnRevive.onclick = () => {
                AdManager.showRewardAd(() => {
                    window.gameLogic.tryReviveWithAd();
                });
            };
        }
    }

    // 2. 게임 종료 후 [Main Menu] 버튼 (여기에만 광고 적용)
    const btnMenu = document.getElementById('btn-go-home');
    if(btnMenu) {
        // 기존 이벤트 제거를 위해 새로 복제하거나 덮어쓰기
        const newBtn = btnMenu.cloneNode(true);
        btnMenu.parentNode.replaceChild(newBtn, btnMenu);
        
        newBtn.onclick = () => {
            // 쿨타임이면 광고 스킵하고 바로 이동, 아니면 광고 보고 이동
            AdManager.showRewardAd(() => {
                location.reload();
            });
        };
    }
    
    // 유저 UI 처리
    const name = localStorage.getItem('alpha_username');
    const existArea = document.getElementById('area-exist-user');
    const newArea = document.getElementById('area-new-user');
    const btnExistSave = document.getElementById('btn-just-save');
    if(btnExistSave) {
        btnExistSave.style.display = 'block';
        btnExistSave.textContent = "Save Score";
    }
    const btnNewSave = document.getElementById('btn-check-save');
    if(btnNewSave) btnNewSave.style.display = 'block';

    if(name) {
         if(existArea) { 
             existArea.style.display = 'block'; 
             document.getElementById('user-badge').textContent = name; 
         }
         if(newArea) newArea.style.display = 'none';
    } else {
         if(existArea) existArea.style.display = 'none';
         if(newArea) newArea.style.display = 'block';
    }
}

export function nextTurn() { checkHandAndRefill(); }

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
