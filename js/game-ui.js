import { state, ALPHABET } from "./game-data.js";

// 1. 그리드 그리기 (기존 동일)
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

// 2. 핸드 그리기 [수정됨: 클릭 방해 해결]
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        
        slot.innerHTML = '';
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            
            // [핵심 수정] 블록 그림이 클릭을 가로채지 못하게 설정
            miniGrid.style.pointerEvents = 'none'; 
            
            // 스타일 설정
            miniGrid.className = 'mini-grid';
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            
            // 크기 키움 (가시성 확보)
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            
            // 중앙 정렬 보정
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
                
                // 그리드 배치
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                
                miniGrid.appendChild(cell);
            });
            slot.appendChild(miniGrid);
            
            // 슬롯에 드래그 이벤트 연결
            if(window.setupDragForSlot) window.setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 텍스트 갱신 (기존 동일)
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

// 4. 게임오버 UI (기존 동일)
export function updateGameOverUI() {
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

// 5. 드래그 셋업 (기존 동일)
export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
    window.setupDragForSlot = setupDragForSlot;
}

// 6. 내부 드래그 로직 (기존 동일)
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

        // 고스트 생성
        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '3px';
        ghost.style.pointerEvents = 'none'; // 고스트도 클릭 방지
        
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

        // 초기 위치 설정 (클릭하자마자 고스트가 손가락 위치로)
        const initPos = getPos(e);
        ghost.style.left = (initPos.x - ghost.offsetWidth/2) + 'px';
        ghost.style.top = (initPos.y - ghost.offsetHeight - 80) + 'px';
        ghost.style.display = 'grid'; // 보이게 설정

        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            
            ghost.style.left = (p.x - ghost.offsetWidth/2) + 'px';
            ghost.style.top = (p.y - ghost.offsetHeight - 80) + 'px';

            const idx = getMagnetIndex(p.x, p.y - 80);
            
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

            const p = getPos(ee);
            const idx = getMagnetIndex(p.x, p.y - 80);
            
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

    // 슬롯에 이벤트 리스너 연결
    slot.onmousedown = start;
    slot.ontouchstart = start;
}

function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const cellSize = (grid.offsetWidth - (state.gridSize-1)*3) / state.gridSize; 
    
    if (x < rect.left - 20 || x > rect.right + 20 || y < rect.top - 20 || y > rect.bottom + 20) return -1;
    
    const lx = x - rect.left;
    const ly = y - rect.top;

    const c = Math.floor(lx / cellSize);
    const r = Math.floor(ly / cellSize);
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
