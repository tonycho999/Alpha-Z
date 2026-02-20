import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); UI.updateUI();
    }
}

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

function checkGameOver() {
    let canPlace = false;
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            if (Core.canPlaceAnywhere(state.hand[i])) { canPlace = true; break; }
        }
    }

    if (!canPlace) {
        AudioMgr.play('over');
        const popup = document.getElementById('popup-over');
        popup.style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        
        // 부활 버튼 연결
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
                        // 중앙 3x3 비우기
                        const center = Math.floor(state.gridSize/2);
                        for(let r=center-1; r<=center+1; r++){
                            for(let c=center-1; c<=center+1; c++){
                                state.grid[r*state.gridSize+c] = null;
                            }
                        }
                        popup.style.display = 'none';
                        UI.renderGrid();
                    });
                };
            }
        }

        const name = localStorage.getItem('alpha_username');
        if(name) {
             document.getElementById('area-exist-user').style.display = 'block';
             document.getElementById('user-badge').textContent = name;
        } else {
             document.getElementById('area-new-user').style.display = 'block';
        }
    }
}

// 나머지 함수들은 기존과 동일합니다. (handleDropAttempt 등)
// 파일이 너무 길어질까봐 생략했지만, 기존 game-flow.js의 하단부는 그대로 두시면 됩니다.
// (만약 전체가 필요하시면 말씀해주세요)

export function handleDropAttempt(targetIdx, isPreview) {
    const block = state.hand[state.dragIndex];
    if (!block) return false;
    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = block.shape;
    let finalIndices = null;
    for (let i = 0; i < shape.map.length; i++) {
        const anchorR = r - shape.map[i][0], anchorC = c - shape.map[i][1];
        let possible = true, temp = [];
        for (let j = 0; j < shape.map.length; j++) {
            const tr = anchorR + shape.map[j][0], tc = anchorC + shape.map[j][1];
            const tidx = tr * size + tc;
            if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { possible = false; break; }
            temp.push(tidx);
        }
        if (possible) { finalIndices = temp; break; }
    }
    if(!finalIndices) return false;
    if(isPreview) {
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });
        return true;
    } else {
        placeBlock(finalIndices, block);
        return true;
    }
}

async function placeBlock(indices, block) {
    if(state.isLocked) return;
    state.isLocked = true;
    try {
        AudioMgr.play('drop');
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        state.hand[state.dragIndex] = null;
        UI.renderGrid(); UI.renderHand(); 
        await wait(200);

        const newIndices = indices;
        let checkAgain = true;
        while(checkAgain) {
            checkAgain = false;
            let merged = false;
            for(let i=0; i<state.gridSize*state.gridSize; i++) {
                if(state.grid[i]) {
                    const cluster = Core.getCluster(i);
                    if(cluster.length >= 2) {
                        await processMerge(cluster, newIndices);
                        merged = true; break; 
                    }
                }
            }
            if(merged) { checkAgain = true; continue; }
            const minIdx = Core.getMinIdx();
            let upgraded = false;
            for(let i=0; i<state.gridSize*state.gridSize; i++) {
                if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                    state.grid[i] = ALPHABET[minIdx];
                    upgraded = true;
                    const cell = document.getElementById(`cell-${i}`);
                    if(cell) { cell.classList.add('merging-source'); setTimeout(()=>cell.classList.remove('merging-source'), 300); }
                }
            }
            if(upgraded) { refreshRemainingHand(); UI.renderGrid(); await wait(300); checkAgain = true; }
        }
    } catch (e) { console.error(e); } finally {
        state.isLocked = false; checkHandAndRefill();
    }
}

function refreshRemainingHand() {
    let hasChange = false;
    for(let i=0; i<3; i++) {
        if (state.hand[i] !== null) { state.hand[i] = Core.createRandomBlock(); hasChange = true; }
    }
    if (hasChange) { UI.renderHand(); AudioMgr.play('merge'); }
}

async function processMerge(cluster, newIndices) {
    AudioMgr.play('merge');
    let centerIdx = cluster.find(idx => !newIndices.includes(idx));
    if (centerIdx === undefined) centerIdx = cluster[0];
    const char = state.grid[centerIdx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    const next = ALPHABET[nextIdx] || char; 
    
    // UI 효과
    const centerEl = document.getElementById(`cell-${centerIdx}`);
    for(let t of cluster) {
        if(t === centerIdx) continue;
        const el = document.getElementById(`cell-${t}`);
        if(el && centerEl) {
            el.classList.add('merging-source');
            el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
            el.style.opacity = '0';
        }
    }
    await wait(300);

    state.grid[centerIdx] = next;
    cluster.forEach(n => { if(n !== centerIdx) state.grid[n] = null; });
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    if(nextIdx >= ALPHABET.indexOf('O') && !state.isAdmin) {
        state.stars++; localStorage.setItem('alpha_stars', state.stars);
    }
    UI.renderGrid(); UI.updateUI(); await wait(150);
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
