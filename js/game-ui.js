import { state, ALPHABET } from "./game-data.js";

// 1. 그리드 그리기 (export 필수!)
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
        
        // 클릭 이벤트
        cell.onclick = () => {
             if(window.gameLogic && window.gameLogic.handleCellClick) {
                 window.gameLogic.handleCellClick(idx);
             }
        };
        gridEl.appendChild(cell);
    });
}

// 2. 핸드(대기열) 그리기 - [수정] 크기 키움
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        
        slot.innerHTML = '';
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            // 미니 그리드 스타일
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            // [중요] 핸드 블록 크기 조정 (기존보다 크게)
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            
            block.items.forEach((char, idx) => {
                const cell = document.createElement('div');
                cell.className = `cell b-${char}`; // small 클래스 제거하여 크게 보임
                cell.textContent = char;
                cell.style.fontSize = '1.2rem'; // 글자도 키움
                cell.style.width = '100%';
                cell.style.height = '100%';
                
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                miniGrid.appendChild(cell);
            });
            slot.appendChild(miniGrid);
            
            if(window.setupDragForSlot) window.setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 텍스트 갱신
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

// 4. 게임오버 UI
export function updateGameOverUI() {
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

// 5. 드래그 셋업
export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
    window.setupDragForSlot = setupDragForSlot;
}

function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    // 실제 셀 크기 계산
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

        // 고스트 생성
        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '3px';
        
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

        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            
            ghost.style.left = (p.x - ghost.offsetWidth/2) + 'px';
            ghost.style.top = (p.y - ghost.offsetHeight - 80) + 'px';

            // 자석 감지
            const idx = getMagnetIndex(p.x, p.y - 80);
            
            // [수정] 예측 효과 초기화
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge')); // 합체 예측 초기화
            
            if (idx !== -1 && window._onDropCallback) {
                 // 미리보기 실행 (Highlight + Merge Check)
                 window._onDropCallback(idx, true); 
            }
        };

        const endHandler = (ee) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);

            const p = getPos(ee);
            const idx = getMagnetIndex(p.x, p.y - 80);
            
            let success = false;
            if (idx !== -1 && window._onDropCallback) {
                success = window._onDropCallback(idx, false); // 실제 드롭
            }
            
            ghost.style.display = 'none';
            if (!success) {
                slot.style.opacity = '1';
                state.dragIndex = -1;
            }
            // 효과 제거
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
    const cellSize = (grid.offsetWidth - (state.gridSize-1)*3) / state.gridSize; 
    
    // 약간의 여유 범위(padding)
    if (x < rect.left - 20 || x > rect.right + 20 || y < rect.top - 20 || y > rect.bottom + 20) return -1;
    
    // 로컬 좌표
    const lx = x - rect.left;
    const ly = y - rect.top;

    const c = Math.floor(lx / cellSize);
    const r = Math.floor(ly / cellSize);
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
