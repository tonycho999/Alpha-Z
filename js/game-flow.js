import { state, ALPHABET, SHAPES_1 } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";

// 망치 모드일 때 셀 클릭 처리
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
    }
}

// 다음 턴 진행 (게임 오버 체크 포함)
export function nextTurn() {
    state.currentBlock = state.nextBlock;
    state.nextBlock = Core.createRandomBlock();
    
    setTimeout(() => {
        UI.renderSource(state.currentBlock, 'source-block');
        UI.renderSource(state.nextBlock, 'next-preview');
        UI.setupDrag(handleDropAttempt);
    }, 50);

    // 게임 오버 체크
    if(!Core.canPlaceAnywhere(state.currentBlock)) {
        document.getElementById('popup-over').style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        
        const reviveBtn = document.getElementById('btn-revive-ad');
        
        // 어드민이거나 이미 부활했으면 버튼 숨김
        if(state.isAdmin || state.hasRevived) {
            reviveBtn.style.display = 'none';
        } else {
            reviveBtn.style.display = 'flex'; 
        }

        const name = localStorage.getItem('alpha_username');
        document.getElementById(name ? 'area-exist-user' : 'area-new-user').style.display = 'block';
        if(name) document.getElementById('user-badge').textContent = name;
    }
}

// 드롭 유효성 검사 및 하이라이트
export function handleDropAttempt(targetIdx, isPreview) {
    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = state.currentBlock.shape;
    let finalIndices = null;

    // 부활 턴(만능 블록)일 경우: 범위만 맞으면 OK
    if (state.isReviveTurn) {
        if (r >= 0 && r < size && c >= 0 && c < size) finalIndices = [targetIdx];
    } else {
        // 일반 턴: 빈칸 체크
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
    }

    if(!finalIndices) return false;

    if(isPreview) {
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) {
                el.classList.add('highlight-valid');
                if(state.isReviveTurn) el.style.boxShadow = '0 0 10px #4CAF50'; 
            }
        });
        return true;
    } else {
        placeBlock(finalIndices);
        return true;
    }
}

// 블록 실제 배치 및 병합 로직
async function placeBlock(indices) {
    state.isLocked = true;
    
    if(state.isReviveTurn) {
        state.isReviveTurn = false;
        document.getElementById('popup-over').style.display = 'none';
    }

    indices.forEach((pos, i) => state.grid[pos] = state.currentBlock.items[i]);
    UI.renderGrid();
    await wait(300);

    let checkAgain = true;
    while(checkAgain) {
        checkAgain = false;
        
        // 1. 병합(Merge) 체크
        let merged = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cluster = Core.getCluster(i);
                if(cluster.length >= 2) {
                    await processMerge(i, cluster);
                    merged = true; break; 
                }
            }
        }
        if(merged) { checkAgain = true; continue; }

        // 2. 자동 업그레이드 체크 (최소 등급 미만 제거)
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
        if(upgraded) { UI.renderGrid(); await wait(300); checkAgain = true; }
    }
    
    state.isLocked = false;
    nextTurn();
}

// 병합 처리 상세 로직
async function processMerge(idx, cluster) {
    const char = state.grid[idx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    const next = ALPHABET[nextIdx] || char;

    const centerEl = document.getElementById(`cell-${idx}`);
    for(let t of cluster) {
        if(t===idx) continue;
        const el = document.getElementById(`cell-${t}`);
        if(el) {
            el.classList.add('merging-source');
            el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
            el.style.opacity = '0';
        }
    }
    await wait(400);

    state.grid[idx] = next;
    cluster.forEach(n => { if(n !== idx) state.grid[n] = null; });
    
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    
    if(nextIdx >= ALPHABET.indexOf('O')) {
        if(!state.isAdmin) {
            state.stars++; localStorage.setItem('alpha_stars', state.stars);
        }
        if(next === 'O' && !state.hasReachedO) {
            state.hasReachedO = true;
            if(!state.isAdmin) {
                alert("🎉 Congratulations! You reached 'O'! \nA sponsor ad will open to support us. (+1 Star)");
                window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            }
        }
    }
    UI.renderGrid(); 
    UI.updateUI(); 
    await wait(200);
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
