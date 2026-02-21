import { state, ALPHABET } from "./game-data.js";

// 1. 그리드 그리기
export function renderGrid() {
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gap = '3px';
    state.grid.forEach((char, idx) => {
        const cell = document.createElement('div');
        cell.id = `cell-${idx}`;
        cell.className = 'cell';
        if(state.isHammerMode) cell.classList.add('hammer-target');
        if (char) { cell.classList.add(`b-${char}`); cell.textContent = char; } 
        else { cell.classList.add('empty'); }
        cell.onclick = () => {
             if(window.gameLogic && window.gameLogic.handleCellClick) window.gameLogic.handleCellClick(idx);
        };
        gridEl.appendChild(cell);
    });
}

// 2. 핸드 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        slot.innerHTML = '';
        slot.style.opacity = '1';
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            miniGrid.style.pointerEvents = 'none';
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            miniGrid.style.justifySelf = 'center'; miniGrid.style.alignSelf = 'center';
            block.items.forEach((char, idx) => {
                const cell = document.createElement('div');
                cell.className = `cell b-${char}`;
                cell.textContent = char;
                cell.style.fontSize = '1.2rem';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                miniGrid.appendChild(cell);
            });
            slot.appendChild(miniGrid);
            setupDragForSlot(slot, i);
        }
    }
}

// [핵심 수정] UI 업데이트 (아이템 개수 표시)
export function updateUI() {
    const bestEl = document.getElementById('ui-best');
    if(bestEl) bestEl.textContent = state.best;
    
    const starEl = document.getElementById('ui-stars');
    if(starEl) starEl.textContent = state.stars;

    const diffEl = document.getElementById('ui-diff');
    if(diffEl) diffEl.textContent = state.diff;

    const scoreEl = document.getElementById('ui-score');
    if(scoreEl) scoreEl.textContent = state.score;

    // 아이템 개수 표시 (HTML에 해당 ID가 있어야 함)
    if (state.items) {
        const refCnt = document.getElementById('cnt-refresh');
        if(refCnt) refCnt.textContent = state.items.refresh || 0;
        
        const hamCnt = document.getElementById('cnt-hammer');
        if(hamCnt) hamCnt.textContent = state.items.hammer || 0;
        
        const upCnt = document.getElementById('cnt-upgrade');
        if(upCnt) upCnt.textContent = state.items.upgrade || 0;
    }
}

export function updateGameOverUI() {
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
}

function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    const getRealCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        const cell = gridEl.querySelector('.cell');
        if (cell) return cell.offsetWidth;
        return (gridEl.offsetWidth - (state.gridSize - 1) * 3) / state.gridSize;
    };
    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getRealCellSize();
        const block = state.hand[index];
        if(!block) return;
        const yOffset = cellSize * 1.8; 
        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '3px';
        ghost.style.pointerEvents = 'none'; 
        block.items.forEach((char, idx) => {
            const b = document.createElement('div');
            b.className = `cell b-${char}`;
            b.textContent = char;
            b.style.fontSize = (cellSize * 0.55) + 'px';
            b.style.gridColumnStart = block.shape.map[idx][1] + 1;
            b.style.gridRowStart = block.shape.map[idx][0] + 1;
            ghost.appendChild(b);
        });
        slot.style.opacity = '0'; 
        const getPos = (ev) => {
            const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
            return { x: t.clientX, y: t.clientY };
        };
        const updateGhostPos = (x, y) => {
            const ghostW = ghost.offsetWidth;
            const ghostH = ghost.offsetHeight;
            ghost.style.left = (x - ghostW / 2) + 'px';
            ghost.style.top = (y - ghostH - yOffset) + 'px'; 
        };
        const initPos = getPos(e);
        ghost.style.display = 'grid';
        updateGhostPos(initPos.x, initPos.y);
        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            updateGhostPos(p.x, p.y);
            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;
            const idx = getMagnetIndex(centerX, centerY);
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));
            if (idx !== -1 && window._onDropCallback) window._onDropCallback(idx, true);
        };
        const endHandler = (ee) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);
            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;
            const idx = getMagnetIndex(centerX, centerY);
            let success = false;
            if (idx !== -1 && window._onDropCallback) success = window._onDropCallback(idx, false);
            ghost.style.display = 'none';
            if (!success) { slot.style.opacity = '1'; state.dragIndex = -1; }
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));
        };
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchend', endHandler);
    };
    slot.onmousedown = start;
    slot.ontouchstart = start;
}

function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const gap = 3;
    const padding = 5; 
    const cellSize = (rect.width - (state.gridSize - 1) * gap - (padding * 2)) / state.gridSize;
    if (x < rect.left - 10 || x > rect.right + 10 || y < rect.top - 10 || y > rect.bottom + 10) return -1;
    let correctionY = 0;
    if (state.gridSize === 8) correctionY = 20; 
    else if (state.gridSize === 9) correctionY = -10; 
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding + correctionY; 
    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) return r * state.gridSize + c;
    return -1;
}
