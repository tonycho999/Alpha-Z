import { state, ALPHABET, initGridSize } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    document.getElementById('ui-diff').textContent = state.diff;
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    initGridSize(state.diff);
    
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => handleCellClick(i);
        container.appendChild(div);
    }

    state.nextBlock = Core.createRandomBlock();
    nextTurn();
    UI.updateUI();

    document.getElementById('btn-check-save').onclick = async () => {
        const name = document.getElementById('username-input').value.trim();
        if(!name) return alert('이름 입력 필수');
        const res = await Core.saveScoreToDB(name);
        if(res.success) {
            document.getElementById('area-new-user').style.display='none';
            document.getElementById('save-msg').style.display='block';
        } else alert(res.msg);
    };

    document.getElementById('btn-just-save').onclick = () => {
        Core.saveScoreToDB(localStorage.getItem('alpha_username'));
        document.getElementById('area-exist-user').style.display='none';
        document.getElementById('save-msg').style.display='block';
    };
};

function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.stars -= 2;
        localStorage.setItem('alpha_stars', state.stars);
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); UI.updateUI();
    }
}

function nextTurn() {
    state.currentBlock = state.nextBlock;
    state.nextBlock = Core.createRandomBlock();
    
    // 리사이즈 될때마다 소스 블록 크기를 갱신하기 위한 약간의 딜레이
    setTimeout(() => {
        UI.renderSource(state.currentBlock, 'source-block');
        UI.renderSource(state.nextBlock, 'next-preview');
        UI.setupDrag(handleDropAttempt);
    }, 50);

    if(!Core.canPlaceAnywhere(state.currentBlock)) {
        document.getElementById('popup-over').style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        const name = localStorage.getItem('alpha_username');
        document.getElementById(name ? 'area-exist-user' : 'area-new-user').style.display = 'block';
        if(name) document.getElementById('user-badge').textContent = name;
    }
}

function handleDropAttempt(targetIdx, isPreview) {
    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = state.currentBlock.shape;
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
        finalIndices.forEach(i => document.getElementById(`cell-${i}`).classList.add('highlight-valid'));
        return true;
    } else {
        placeBlock(finalIndices);
        return true;
    }
}

async function placeBlock(indices) {
    state.isLocked = true;
    indices.forEach((pos, i) => state.grid[pos] = state.currentBlock.items[i]);
    UI.renderGrid();
    await wait(300);

    let checkAgain = true;
    while(checkAgain) {
        checkAgain = false;
        
        // 1. 합치기
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

        // 2. [신규 기능] 자동 업그레이드 (더 이상 나오지 않는 알파벳 교체)
        const minIdx = Core.getMinIdx();
        let upgraded = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                state.grid[i] = ALPHABET[minIdx];
                upgraded = true;
                const cell = document.getElementById(`cell-${i}`);
                if(cell) { cell.classList.add('merging-source'); setTimeout(()=>cell.classList.remove('merging-source'),300); }
            }
        }
        if(upgraded) {
            UI.renderGrid(); await wait(300);
            checkAgain = true; // 업그레이드 후 합쳐질 게 있는지 다시 스캔
        }
    }
    
    state.isLocked = false;
    nextTurn();
}

async function processMerge(idx, cluster) {
    const char = state.grid[idx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1); // AAA=C, AAAA=D 적용
    const next = ALPHABET[nextIdx] || char;

    const centerEl = document.getElementById(`cell-${idx}`);
    for(let t of cluster) {
        if(t===idx) continue;
        const el = document.getElementById(`cell-${t}`);
        el.classList.add('merging-source');
        el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
        el.style.opacity = '0';
    }
    await wait(400);

    state.grid[idx] = next;
    cluster.forEach(n => { if(n !== idx) state.grid[n] = null; });
    
    if(nextIdx >= ALPHABET.indexOf('O')) {
        state.stars++; localStorage.setItem('alpha_stars', state.stars);
    }
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    
    UI.renderGrid(); UI.updateUI(); await wait(200);
}

window.gameLogic = {
    useHammer: () => {
        if(state.stars < 2) return alert('스타가 부족합니다 (2성 필요)');
        state.isHammerMode = !state.isHammerMode;
        document.getElementById('grid-container').classList.toggle('hammer-mode');
    },
    useRefresh: () => {
        if(state.stars < 1) return alert('스타가 부족합니다 (1성 필요)');
        state.stars -= 1; localStorage.setItem('alpha_stars', state.stars);
        UI.updateUI(); nextTurn();
    },
    revive: () => {
        if(state.stars < 5) return alert('스타 부족');
        state.stars -= 5; localStorage.setItem('alpha_stars', state.stars);
        for(let i=0; i<state.gridSize; i++) state.grid[i] = null; // 최상단 1줄 삭제
        document.getElementById('popup-over').style.display = 'none';
        UI.renderGrid(); UI.updateUI(); nextTurn();
    }
};

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
