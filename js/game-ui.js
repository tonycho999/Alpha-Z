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

        if (char) {
            cell.classList.add(`b-${char}`);
            cell.textContent = char;
        } else {
            cell.classList.add('empty');
        }
        
        cell.onclick = () => {
             if(window.gameLogic && window.gameLogic.handleCellClick) {
                 window.gameLogic.handleCellClick(idx);
             }
        };
        gridEl.appendChild(cell);
    });
}

// 2. 핸드(대기열) 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        
        slot.innerHTML = '';
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            // 터치 이벤트 통과 (슬롯이 클릭되게)
            miniGrid.style.pointerEvents = 'none';
            
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            
            // 크기 크게
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            miniGrid.style.justifySelf = 'center';
            miniGrid.style.alignSelf = 'center';

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
            
            // 내부 함수 직접 호출
            setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 업데이트
export function updateUI() {
    const bestEl = document.getElementById('ui-best');
    if(bestEl) bestEl.textContent = state.best;
    
    const starEl = document.getElementById('ui-stars');
    if(starEl) starEl.textContent = state.stars;

    const diffEl = document.getElementById('ui-diff');
    if(diffEl) diffEl.textContent = state.diff;

    const scoreEl = document.getElementById('ui-score');
    if(scoreEl) scoreEl.textContent = state.score;
}

export function updateGameOverUI() {
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
}

// [핵심] 드래그 로직 (좌표 오차 해결)
function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    const getCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        const cell = gridEl.querySelector('.cell');
        return cell ? cell.offsetWidth : 45;
    };

    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getCellSize();
        const block = state.hand[index];
        if(!block) return;

        // Ghost 모양 잡기
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
            b.style.fontSize = (cellSize * 0.5) + 'px';
            b.style.gridColumnStart = block.shape.map[idx][1] + 1;
            b.style.gridRowStart = block.shape.map[idx][0] + 1;
            ghost.appendChild(b);
        });
        
        slot.style.opacity = '0'; 
        
        const getPos = (ev) => {
            const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
            return { x: t.clientX, y: t.clientY };
        };

        // Ghost 위치 보정 (손가락 위로 띄움)
        const updateGhostPos = (x, y) => {
            const ghostW = ghost.offsetWidth;
            const ghostH = ghost.offsetHeight;
            ghost.style.left = (x - ghostW / 2) + 'px';
            ghost.style.top = (y - ghostH - 80) + 'px'; 
        };

        const initPos = getPos(e);
        ghost.style.display = 'grid';
        updateGhostPos(initPos.x, initPos.y);

        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            updateGhostPos(p.x, p.y);

            // [중요] 자석 감지는 Ghost의 중심점을 기준으로 해야 정확함!
            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;

            const idx = getMagnetIndex(centerX, centerY);
            
            // 초기화
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));
            
            if (idx !== -1 && window._onDropCallback) {
                 window._onDropCallback(idx, true); // 미리보기 (하이라이트 + 반짝임)
            }
        };

        const endHandler = (ee) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);

            // 마지막 위치 기준 드롭 시도
            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;
            const idx = getMagnetIndex(centerX, centerY);
            
            let success = false;
            if (idx !== -1 && window._onDropCallback) {
                success = window._onDropCallback(idx, false);
            }
            
            ghost.style.display = 'none';
            if (!success) {
                slot.style.opacity = '1';
                state.dragIndex = -1;
            }
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

// 자석 인덱스 계산
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const cellSize = (grid.offsetWidth - (state.gridSize-1)*3) / state.gridSize; 
    
    // 약간의 여유 허용
    if (x < rect.left - 10 || x > rect.right + 10 || y < rect.top - 10 || y > rect.bottom + 10) return -1;
    
    const lx = x - rect.left;
    const ly = y - rect.top;

    const c = Math.floor(lx / cellSize);
    const r = Math.floor(ly / cellSize);
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
