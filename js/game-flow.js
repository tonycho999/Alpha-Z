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

// [핵심] 핸드 관리 및 리필 함수
export function checkHandAndRefill() {
    // 핸드가 다 비었는지 확인
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        // 3개 생성
        state.hand = [
            Core.createRandomBlock(),
            Core.createRandomBlock(),
            Core.createRandomBlock()
        ];
        
        UI.renderHand();
        UI.setupDrag(handleDropAttempt);
        
        checkGameOver();
    } else {
        // 비어있지 않아도 게임오버인지 체크
        checkGameOver();
    }
}

function checkGameOver() {
    let canPlace = false;
    // 남은 블록 중 하나라도 놓을 수 있으면 생존
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
        // ... (나머지 UI 처리)
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

// 드롭 시도 처리
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
            if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx] !== null) { possible = false; break; }
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
    state.isLocked = true;
    AudioMgr.play('drop');

    // 1. 그리드 배치
    indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
    
    // 2. 사용한 블록 제거
    state.hand[state.dragIndex] = null;
    
    UI.renderGrid();
    UI.renderHand(); 
    await wait(300);

    // 3. 병합 및 승급 로직
    const newIndices = indices;
    let checkAgain = true;
    
    while(checkAgain) {
        checkAgain = false;
        
        // 병합
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

        // 자동 승급
        const minIdx = Core.getMinIdx();
        let upgraded = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                state.grid[i] = ALPHABET[minIdx];
                upgraded = true;
                const cell = document.getElementById(`cell-${i}`);
                if(cell) { 
                    cell.classList.add('merging-source'); 
                    setTimeout(()=>cell.classList.remove('merging-source'), 300); 
                }
            }
        }
        
        if(upgraded) { 
            // 승급 시 남은 블록 교체!
            refreshRemainingHand();
            UI.renderGrid(); 
            await wait(300); 
            checkAgain = true; 
        }
    }
    
    state.isLocked = false;
    checkHandAndRefill();
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
    let centerIdx = cluster.find(idx => !newIndices.includes(idx));
    if (centerIdx === undefined) centerIdx = cluster[0];

    const char = state.grid[centerIdx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    const next = ALPHABET[nextIdx] || char;

    const centerEl = document.getElementById(`cell-${centerIdx}`);
    for(let t of cluster) {
        if(t === centerIdx) continue;
        const el = document.getElementById(`cell-${t}`);
        if(el) {
            el.classList.add('merging-source');
            el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
            el.style.opacity = '0';
        }
    }
    await wait(400);

    state.grid[centerIdx] = next;
    cluster.forEach(n => { if(n !== centerIdx) state.grid[n] = null; });
    
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    
    if(nextIdx >= ALPHABET.indexOf('O')) {
        if(!state.isAdmin) {
            state.stars++; localStorage.setItem('alpha_stars', state.stars);
        }
        if(next === 'O' && !state.hasReachedO) {
            state.hasReachedO = true;
            if(!state.isAdmin) {
                alert("🎉 Congratulations! You reached 'O'! (+1 Star)");
            }
        }
    }
    UI.renderGrid(); 
    UI.updateUI(); 
    await wait(200);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
