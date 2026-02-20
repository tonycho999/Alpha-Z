import { state } from "./game-data.js";

export function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 40;
    const rect = grid.getBoundingClientRect();
    const size = rect.width / state.gridSize;
    return size > 0 ? size : 40;
}

export function renderGrid() { 
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;

    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

    // 셀 생성 (없는 경우에만)
    if (gridEl.children.length !== state.gridSize * state.gridSize) {
        gridEl.innerHTML = '';
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            const div = document.createElement('div');
            div.className = 'cell'; 
            div.id = `cell-${i}`;
            gridEl.appendChild(div);
        }
    }

    // 셀 렌더링
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;
        
        const hasHighlight = cell.classList.contains('highlight-valid');
        cell.className = 'cell'; 
        if (hasHighlight) cell.classList.add('highlight-valid');
        
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';

        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
        }
    }
}

export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        
        slot.innerHTML = ''; 
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            const size = 28; 
            const gridDiv = document.createElement('div');
            gridDiv.style.display = 'grid';
            gridDiv.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
            gridDiv.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
            gridDiv.style.gap = '2px';
            gridDiv.style.pointerEvents = 'none'; 

            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '0.9rem';
                b.style.width = size + 'px';
                b.style.height = size + 'px';
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                gridDiv.appendChild(b);
            });
            slot.appendChild(gridDiv);
        }
    }
}

// 드래그 오프셋 (손가락보다 얼마나 위로 띄울지)
const DRAG_Y_OFFSET = 80;

export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        
        slot.onmousedown = null;
        slot.ontouchstart = null;

        if (!state.hand[i]) continue; 

        const start = (e) => {
            if(state.isLocked) return;
            state.dragIndex = i; 
            
            // 고스트 생성
            const cellSize = getActualCellSize();
            const block = state.hand[i];
            
            ghost.innerHTML = '';
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
            ghost.style.gap = '2px';
            
            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '1.5rem';
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                ghost.appendChild(b);
            });

            slot.style.opacity = '0'; // 슬롯 숨김

            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            
            const pos = getPos(e);
            moveGhost(pos.x, pos.y);

            function moveGhost(x, y) {
                const w = ghost.offsetWidth;
                const h = ghost.offsetHeight;
                ghost.style.left = (x - w/2) + 'px';
                ghost.style.top = (y - h/2 - DRAG_Y_OFFSET) + 'px'; 
                
                // 미리보기
                const idx = getMagnetGridIndex(x, y - DRAG_Y_OFFSET);
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                if (idx !== -1) {
                    onDrop(idx, true); 
                }
            }

            const moveHandler = (me) => {
                if(me.cancelable) me.preventDefault();
                const p = getPos(me);
                moveGhost(p.x, p.y);
            };

            const endHandler = (ee) => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchend', endHandler);

                const p = getPos(ee);
                const idx = getMagnetGridIndex(p.x, p.y - DRAG_Y_OFFSET);
                
                let success = false;
                if (idx !== -1) {
                    success = onDrop(idx, false); // 진짜 드롭
                }

                ghost.style.display = 'none';
                if (!success) {
                    slot.style.opacity = '1'; // 실패하면 복귀
                }
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler, { passive: false });
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchend', endHandler);
        };

        slot.onmousedown = start;
        slot.ontouchstart = start;
    }
}

export function getMagnetGridIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    // 약간의 여유 범위(padding)을 두어 터치 보정
    if (x < rect.left - 20 || x > rect.right + 20 || y < rect.top - 20 || y > rect.bottom + 20) return -1;
    
    const size = getActualCellSize();
    // 좌표를 그리드 내부로 클램핑(Clamp)
    const relX = Math.max(0, Math.min(x - rect.left, rect.width - 1));
    const relY = Math.max(0, Math.min(y - rect.top, rect.height - 1));
    
    const c = Math.floor(relX / size);
    const r = Math.floor(relY / size);

    if (r >= 0 && r < state.gridSize && c >= 0 && c < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}

export function updateUI() {
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;
}
