import { state, ALPHABET } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";

// ... (handleCellClick, nextTurn, handleDropAttempt 등은 기존 코드 유지) ...
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); UI.updateUI();
    }
}

export function nextTurn() {
    state.currentBlock = state.nextBlock;
    state.nextBlock = Core.createRandomBlock();
    
    setTimeout(() => {
        UI.renderSource(state.currentBlock, 'source-block');
        UI.renderSource(state.nextBlock, 'next-preview');
        UI.setupDrag(handleDropAttempt);
    }, 50);

    if(!Core.canPlaceAnywhere(state.currentBlock)) {
        document.getElementById('popup-over').style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        const reviveBtn = document.getElementById('btn-revive-ad');
        if(state.isAdmin || state.hasRevived) reviveBtn.style.display = 'none';
        else reviveBtn.style.display = 'flex'; 
        const name = localStorage.getItem('alpha_username');
        document.getElementById(name ? 'area-exist-user' : 'area-new-user').style.display = 'block';
        if(name) document.getElementById('user-badge').textContent = name;
    }
}

export function handleDropAttempt(targetIdx, isPreview) {
    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = state.currentBlock.shape;
    let finalIndices = null;

    if (state.isReviveTurn) {
        if (r >= 0 && r < size && c >= 0 && c < size) finalIndices = [targetIdx];
    } else {
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

// [수정 3] 블록 배치 및 '새로 놓인 블록(newIndices)' 추적
async function placeBlock(indices) {
    state.isLocked = true;
    
    if(state.isReviveTurn) {
        state.isReviveTurn = false;
        document.getElementById('popup-over').style.display = 'none';
    }

    // 그리드에 할당
    indices.forEach((pos, i) => state.grid[pos] = state.currentBlock.items[i]);
    UI.renderGrid();
    await wait(300);

    // [중요] 방금 놓은 블록들의 인덱스를 processMerge에 전달 (생존자 판별용)
    const newIndices = indices;

    let checkAgain = true;
    while(checkAgain) {
        checkAgain = false;
        
        // 1. 병합(Merge) 체크
        let merged = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cluster = Core.getCluster(i);
                if(cluster.length >= 2) {
                    // [중요] newIndices를 함께 전달
                    await processMerge(cluster, newIndices);
                    merged = true; break; 
                }
            }
        }
        if(merged) { checkAgain = true; continue; }

        // 2. 자동 업그레이드 및 미리보기 갱신
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
            // [수정] 업그레이드가 발생하면 미리보기 블록도 새로운 난이도에 맞춰 즉시 교체
            state.nextBlock = Core.createRandomBlock();
            UI.renderSource(state.nextBlock, 'next-preview');
            
            UI.renderGrid(); 
            await wait(300); 
            checkAgain = true; 
        }
    }
    
    state.isLocked = false;
    nextTurn();
}

// [수정 4] '오래된 블록 생존' 원칙이 적용된 병합 로직
// idx 대신 cluster 배열과 newIndices(방금 놓은 것들)를 받음
async function processMerge(cluster, newIndices) {
    // 1. 생존할 블록(Center) 결정 로직
    // 기본적으로 클러스터 중 '방금 놓지 않은(오래된)' 블록을 찾음
    let centerIdx = cluster.find(idx => !newIndices.includes(idx));
    
    // 만약 클러스터가 전부 방금 놓은 것들로만 이루어져 있다면(예: 놓자마자 자기들끼리 붙음), 
    // 그냥 첫 번째 놈을 기준으로 함
    if (centerIdx === undefined) {
        centerIdx = cluster[0];
    }

    // 이하 로직은 centerIdx를 기준으로 병합 수행
    const char = state.grid[centerIdx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    const next = ALPHABET[nextIdx] || char;

    const centerEl = document.getElementById(`cell-${centerIdx}`);
    for(let t of cluster) {
        if(t === centerIdx) continue;
        const el = document.getElementById(`cell-${t}`);
        if(el) {
            el.classList.add('merging-source');
            // 살아남을 블록(centerIdx) 쪽으로 빨려들어가는 애니메이션
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
