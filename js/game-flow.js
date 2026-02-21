import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// 1. Cell Click (Hammer Mode)
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
        checkHandAndRefill(); // Check if this action cleared space for game over check
    }
}

// 2. Hand Refill Logic - [CRITICAL FIX]
export function checkHandAndRefill() {
    // Check if all slots are null
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        // Generate 3 NEW blocks
        state.hand = [ 
            Core.createRandomBlock(), 
            Core.createRandomBlock(), 
            Core.createRandomBlock() 
        ];
        
        UI.renderHand();
        // Re-bind drag events to new blocks
        UI.setupDrag(handleDropAttempt); 
        
        // Save state immediately after refill
        Logic.saveGameState();
    }
    
    checkGameOver();
}

// 3. Game Over Check
function checkGameOver() {
    let canPlace = false;
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            // If at least one block can be placed, game continues
            if (Core.canPlaceAnywhere(state.hand[i])) { 
                canPlace = true; 
                break; 
            }
        }
    }
    // Only game over if hand is NOT empty (meaning we have blocks but can't place them)
    // If hand is empty, it will be refilled, so not game over.
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
        if(state.hasRevived) {
            btnRevive.style.display = 'none';
        } else {
            btnRevive.style.display = 'block';
            btnRevive.onclick = () => {
                AdManager.showRewardAd(() => {
                    state.hasRevived = true;
                    state.isReviveTurn = true;
                    
                    // Clear center 3x3
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

// 4. Drop Attempt Logic (Preserved Highlight)
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
        // [Highlight Logic - Preserved]
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });

        // Merge Prediction Highlight
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
        // Actual Drop
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
