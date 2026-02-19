import { state, ALPHABET } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";

// 게임 초기화
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    state.diff = urlParams.get('diff') || 'NORMAL';
    document.getElementById('ui-diff').textContent = state.diff;
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    // 그리드 생성
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<25; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        container.appendChild(div);
    }

    state.nextBlock = Core.createRandomBlock();
    nextTurn();
    UI.updateUI();

    // 버튼 이벤트
    document.getElementById('btn-check-save').onclick = handleNewUserSave;
    document.getElementById('btn-just-save').onclick = () => {
        Core.saveScoreToDB(localStorage.getItem('alpha_username'));
        document.getElementById('save-msg').style.display = 'block';
    };
};

function nextTurn() {
    state.currentBlock = state.nextBlock;
    state.nextBlock = Core.createRandomBlock();
    
    UI.renderSource(state.currentBlock, 'source-block');
    UI.renderSource(state.nextBlock, 'next-preview');
    UI.setupDrag(handleDropAttempt);

    if(!Core.canPlaceAnywhere(state.currentBlock)) showGameOver();
}

// 드래그 핸들러 (isPreview: 미리보기인지 실제 드롭인지)
function handleDropAttempt(targetIdx, isPreview) {
    const indices = findFitIndices(targetIdx);
    if(!indices) return false;

    if(isPreview) {
        indices.forEach(i => document.getElementById(`cell-${i}`).classList.add('highlight-valid'));
        return true;
    } else {
        placeBlock(indices);
        return true;
    }
}

function findFitIndices(targetIdx) {
    const shape = state.currentBlock.shape;
    const r = Math.floor(targetIdx / 5);
    const c = targetIdx % 5;

    for (let i = 0; i < shape.map.length; i++) {
        const refR = shape.map[i][0];
        const refC = shape.map[i][1];
        const anchorR = r - refR, anchorC = c - refC;
        const indices = [];
        let possible = true;

        for (let j = 0; j < shape.map.length; j++) {
            const tr = anchorR + shape.map[j][0];
            const tc = anchorC + shape.map[j][1];
            const tidx = tr * 5 + tc;
            if (tr < 0 || tr >= 5 || tc < 0 || tc >= 5 || state.grid[tidx] !== null) {
                possible = false; break;
            }
            indices.push(tidx);
        }
        if (possible) return indices;
    }
    return null;
}

async function placeBlock(indices) {
    state.isLocked = true;
    indices.forEach((pos, i) => state.grid[pos] = state.currentBlock.items[i]);
    UI.renderGrid();
    await wait(300);

    let changes = true;
    while(changes) {
        changes = false;
        for(let i=0; i<25; i++) {
            if(state.grid[i]) {
                const cluster = Core.getCluster(i);
                if(cluster.length >= 2) {
                    await processMerge(i, cluster);
                    changes = true; break;
                }
            }
        }
    }
    state.isLocked = false;
    nextTurn();
}

async function processMerge(idx, cluster) {
    const char = state.grid[idx];
    const jump = cluster.length - 1;
    const next = ALPHABET[ALPHABET.indexOf(char) + jump] || char;

    // 애니메이션
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
    
    if(ALPHABET.indexOf(next) >= ALPHABET.indexOf('O')) {
        state.stars++;
        localStorage.setItem('alpha_stars', state.stars);
    }
    if(ALPHABET.indexOf(next) > ALPHABET.indexOf(state.best)) state.best = next;
    
    UI.renderGrid();
    UI.updateUI();
    await wait(200);
}

function showGameOver() {
    document.getElementById('popup-over').style.display = 'flex';
    document.getElementById('over-best').textContent = state.best;
    const savedName = localStorage.getItem('alpha_username');
    if(savedName) {
        document.getElementById('area-new-user').style.display = 'none';
        document.getElementById('area-exist-user').style.display = 'block';
        document.getElementById('user-badge').textContent = savedName;
    } else {
        document.getElementById('area-new-user').style.display = 'block';
    }
}

async function handleNewUserSave() {
    const name = document.getElementById('username-input').value.trim();
    if(!name) return alert('이름을 입력하세요');
    const res = await Core.saveScoreToDB(name);
    if(res.success) {
        document.getElementById('area-new-user').style.display = 'none';
        document.getElementById('save-msg').style.display = 'block';
    } else {
        alert(res.msg);
    }
}

// 전역 함수 등록 (HTML 버튼 클릭용)
window.gameLogic = {
    revive: () => {
        if(state.stars < 5) return alert('스타 부족');
        state.stars -= 5;
        localStorage.setItem('alpha_stars', state.stars);
        for(let i=0; i<5; i++) state.grid[i] = null;
        document.getElementById('popup-over').style.display = 'none';
        UI.renderGrid();
        UI.updateUI();
    }
};

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
