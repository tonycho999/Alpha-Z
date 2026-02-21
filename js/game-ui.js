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
            
            // 크기 설정
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

// [드래그 로직]
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

        // 오프셋 설정 (셀 크기에 비례)
        const yOffset = cellSize * 1.8; 

        // Ghost 생성
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
            
            if (idx !== -1 && window._onDropCallback) {
                 window._onDropCallback(idx, true);
            }
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

// [핵심 수정] 자석 인덱스 계산 + 보드 크기별 오차 보정 추가
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    
    // gap(3px) 포함 셀 크기 계산
    const gap = 3;
    const padding = 5; // CSS 패딩값
    const cellSize = (rect.width - (state.gridSize - 1) * gap - (padding * 2)) / state.gridSize;
    
    // 보드 범위 체크 (여유 10px)
    if (x < rect.left - 10 || x > rect.right + 10 || y < rect.top - 10 || y > rect.bottom + 10) return -1;
    
    // [보정 로직 추가됨]
    let correctionY = 0;
    let correctionX = 0;

    // 만약 8x8 보드일 때만 자꾸 윗칸에 놓인다면? -> 숫자를 키워서 아래로 내림
    if (state.gridSize === 7) {
        correctionX = 20;
        correctionY = -20; 
    }
    // 만약 9x9 보드일 때 자꾸 아랫칸에 놓인다면? -> 음수로 만들어서 위로 올림
    else if (state.gridSize === 8) {
        correctionX = 0;
        correctionY = 0; 
    }

    else if (state.gridSize === 9) {
        correctionX = 0;
        correctionY = 0; 
    }
    // 기본(7x7)은 0

    // 내부 좌표 계산 (보정치 적용)
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding + correctionY; // 여기에 적용됨

    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
