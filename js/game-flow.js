import { state, ALPHABET } from "./game-data.js";
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
    // 핸드에 남은 블록이 없으면(모두 null) 리필
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
        document.getElementById('popup-over').style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        
        const name = localStorage.getItem('alpha_username');
        if(name) {
             document.getElementById('area-exist-user').style.display = 'block';
             document.getElementById('user-badge').textContent = name;
        } else {
             document.getElementById('area-new-user').style.display = 'block';
        }
    }
}

export function nextTurn() {
    checkHandAndRefill();
}

export function handleDropAttempt(targetIdx, isPreview) {
    const block = state.hand[state.dragIndex];
    if (!block) return false;

    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = block.shape;
    let finalIndices = null;

    // 배치 가능 여부 확인
    for (let i = 0; i < shape.map.length; i++) {
        const anchorR = r - shape.map[i][0], anchorC = c - shape.map[i][1];
        let possible = true, temp = [];
        for (let j = 0; j < shape.map.length; j++) {
            const tr = anchorR + shape.map[j][0], tc = anchorC + shape.map[j][1];
            const tidx = tr * size + tc;
            // 범위를 벗어나거나 이미 블록이 있으면 불가능
            if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { 
                possible = false; break; 
            }
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

        // 1. 그리드 배치
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        
        // 2. 사용한 블록 제거 및 UI 갱신
        state.hand[state.dragIndex] = null;
        UI.renderGrid();
        UI.renderHand(); 
        
        await wait(200);

        // 3. 병합 및 승급 로직
        const newIndices = indices;
        let checkAgain = true;
        
        while(checkAgain) {
            checkAgain = false;
            
            // 병합 체크
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

            // 자동 승급 체크
            const minIdx = Core.getMinIdx();
            let upgraded = false;
            for(let i=0; i<state.gridSize*state.gridSize; i++) {
                if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                    state.grid[i] = ALPHABET[minIdx];
                    upgraded = true;
                    const cell = document.getElementById(`cell-${i}`);
                    if(cell) { 
                        cell.classList.add('merging-source'); 
                        setTimeout(()=>cell?.classList.remove('merging-source'), 300); 
                    }
                }
            }
            
            if(upgraded) { 
                refreshRemainingHand();
                UI.renderGrid(); 
                await wait(300); 
                checkAgain = true; 
            }
        }
    } catch (e) {
        console.error("PlaceBlock Error:", e);
    } finally {
        state.isLocked = false;
        checkHandAndRefill();
    }
}

function refreshRemainingHand() {
    let hasChange = false;
    for(let i=0; i<3; i++) {
        if (state.hand[i] !== null) {
            state.hand[i] = Core.createRandomBlock();
            hasChange = true;
        }
    }
    if (hasChange) {
        UI.renderHand();
        AudioMgr.play('merge');
    }
}

async function processMerge(cluster, newIndices) {
    AudioMgr.play('merge');
    
    // 새로 놓은 블록이 아니라 '기존에 있던 블록'을 중심으로 병합
    let centerIdx = cluster.find(idx => !newIndices.includes(idx));
    if (centerIdx === undefined) centerIdx = cluster[0];

    const char = state.grid[centerIdx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    // [안전장치] 없는 문자가 나오면 기존 문자 유지
    const next = ALPHABET[nextIdx] || char; 

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

    // 데이터 업데이트
    state.grid[centerIdx] = next;
    cluster.forEach(n => { if(n !== centerIdx) state.grid[n] = null; });
    
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    
    if(nextIdx >= ALPHABET.indexOf('O')) {
        if(!state.isAdmin) {
            state.stars++; localStorage.setItem('alpha_stars', state.stars);
        }
    }
    
    UI.renderGrid(); 
    UI.updateUI(); 
    await wait(150);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
