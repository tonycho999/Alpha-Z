// js/game-ui.js
import { state } from "./game-data.js";

// 셀 크기 계산 (안전장치 추가)
export function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 40; // 기본값
    const rect = grid.getBoundingClientRect();
    const size = rect.width / state.gridSize;
    return size > 0 ? size : 40;
}

export function renderGrid() { 
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;

    // 그리드 설정
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

    // 셀이 없으면 생성 (처음 한 번)
    if (gridEl.children.length !== state.gridSize * state.gridSize) {
        gridEl.innerHTML = '';
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            const div = document.createElement('div');
            div.className = 'cell'; 
            div.id = `cell-${i}`;
            // 클릭 이벤트는 game-flow.js에서 처리하므로 여기선 UI만
            gridEl.appendChild(div);
        }
    }

    // 셀 상태 업데이트
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;
        
        // 기존 스타일 초기화
        cell.className = 'cell'; 
        cell.textContent = ''; 
        cell.style.opacity = '1';

        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
        }
    }
}

// 하단 3개 블록 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        
        slot.innerHTML = ''; // 비우기
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

// 드래그 기능 설정
export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;

        // 기존 이벤트 제거
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
            
            // 초기 위치 설정
            const pos = getPos(e);
            moveGhost(pos.x, pos.y);

            function moveGhost(x, y) {
                const w = ghost.offsetWidth;
                const h = ghost.offsetHeight;
                ghost.style.left = (x - w/2) + 'px';
                ghost.style.top = (y - h/2 - 80) + 'px'; // 손가락보다 조금 위에 표시
                
                // 미리보기 하이라이트
                const idx = getMagnetGridIndex(x, y - 80);
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                if (idx !== -1) {
                    onDrop(idx, true); // isPreview = true
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
                const idx = getMagnetGridIndex(p.x, p.y - 80);
                
                let success = false;
                if (idx !== -1) {
                    success = onDrop(idx, false); // 진짜 드롭
                }

                ghost.style.display = 'none';
                if (!success) {
                    slot.style.opacity = '1'; // 복귀
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
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    
    const size = getActualCellSize();
    const c = Math.floor((x - rect.left) / size);
    const r = Math.floor((y - rect.top) / size);

    if (r >= 0 && r < state.gridSize && c >= 0 && c < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}

export function updateUI() {
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;
}
// export function renderSource() {} // 안 씀
