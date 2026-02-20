import { state } from "./game-data.js";

export function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    return (rect.width - (parseFloat(style.paddingLeft)||0) - (parseFloat(style.paddingRight)||0)) / state.gridSize;
}

export function renderGrid() { 
    const size = getActualCellSize();
    const gridEl = document.getElementById('grid-container');
    
    // 그리드 스타일 동적 적용 (모바일 대응)
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if (!cell) continue; // 안전장치
        
        // 기존 클래스 초기화 (highlight 제외)
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
            cell.classList.add('pop-effect');
        }
    }
}

// [핵심] 하단 3개 블록(Hand) 그리기
export function renderHand() {
    const handContainer = document.getElementById('hand-container');
    if (!handContainer) return;

    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        const block = state.hand[i];
        
        slot.innerHTML = ''; // 비우기
        slot.style.opacity = '1';

        if (block) {
            // 미리보기용 작은 사이즈
            const size = 28; 
            
            const gridDiv = document.createElement('div');
            gridDiv.style.display = 'grid';
            gridDiv.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
            gridDiv.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
            gridDiv.style.gap = '2px';
            gridDiv.style.pointerEvents = 'none'; // 드래그 방해 금지

            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '0.9rem';
                b.style.width = size + 'px';
                b.style.height = size + 'px';
                // 블록 모양대로 배치
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                gridDiv.appendChild(b);
            });
            slot.appendChild(gridDiv);
        }
    }
}

// [핵심] 3개 슬롯 드래그 설정
const VISUAL_OFFSET_Y = 120; 

export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        slot.onmousedown = slot.ontouchstart = null; // 중복 방지

        if (!state.hand[i]) continue; // 빈 슬롯은 패스

        const start = (e) => {
            if(state.isLocked || state.isHammerMode) return;
            
            state.dragIndex = i; // 현재 몇 번째 블록인지 저장
            
            // 고스트(따라다니는 블록) 생성
            const currentCellSize = getActualCellSize();
            const block = state.hand[i];

            ghost.innerHTML = '';
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${currentCellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${currentCellSize}px)`;
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

            slot.style.opacity = '0'; // 원본 숨김

            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            
            const pos = getPos(e);
            updateGhostAndCheck(pos.x, pos.y, ghost.offsetWidth, ghost.offsetHeight, onDrop, false);

            const moveHandler = (me) => {
                if(me.cancelable) me.preventDefault();
                const p = getPos(me);
                updateGhostAndCheck(p.x, p.y, ghost.offsetWidth, ghost.offsetHeight, onDrop, false);
            };

            const endHandler = (ee) => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchend', endHandler);

                const p = getPos(ee);
                // 드롭 시도 (true 리턴 시 성공)
                const success = updateGhostAndCheck(p.x, p.y, ghost.offsetWidth, ghost.offsetHeight, onDrop, true);

                ghost.style.display = 'none';
                if (!success) {
                    slot.style.opacity = '1'; // 실패하면 원본 복귀
                }
                clearHighlights();
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler, { passive: false });
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchend', endHandler);
        };

        slot.onmousedown = slot.ontouchstart = start;
    }
}

function clearHighlights() {
    document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
}

function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');
    ghost.style.left = (fingerX - w/2) + 'px';
    ghost.style.top = (fingerY - h/2 - VISUAL_OFFSET_Y) + 'px';

    const idx = getMagnetGridIndex(fingerX, fingerY - VISUAL_OFFSET_Y);

    if (!isDropAction) clearHighlights();

    if (idx !== -1) {
        if (isDropAction) {
             return onDrop(idx, false); 
        } else {
             onDrop(idx, true); // 미리보기만
        }
    }
    return false;
}

export function getMagnetGridIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;

    const size = getActualCellSize();
    const relX = x - rect.left;
    const relY = y - rect.top;
    
    const c = Math.floor(relX / size);
    const r = Math.floor(relY / size);

    if (r >= 0 && r < state.gridSize && c >= 0 && c < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}

export function renderSource() {} // 사용 안 함
export function updateUI() {
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;
}
