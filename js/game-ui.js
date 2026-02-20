import { state } from "./game-data.js";

function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    return (rect.width - paddingLeft - paddingRight) / state.gridSize;
}

export function renderGrid() {
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        
        const hasHighlight = cell.classList.contains('highlight-valid');
        
        cell.className = 'cell'; 
        if (hasHighlight) cell.classList.add('highlight-valid');
        
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';
        cell.style.border = ''; 

        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
            cell.classList.add('pop-effect');
        }
    }
}

export function renderSource(block, elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    el.innerHTML = '';
    const size = elementId === 'next-preview' ? 25 : getActualCellSize();
    el.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
    
    block.items.forEach((char, i) => {
        const b = document.createElement('div');
        b.className = `cell b-${char}`;
        b.style.fontSize = elementId === 'next-preview' ? '0.8rem' : '1.3rem';
        b.textContent = char;
        b.style.gridColumnStart = block.shape.map[i][1] + 1;
        b.style.gridRowStart = block.shape.map[i][0] + 1;
        if(elementId !== 'next-preview') b.style.boxShadow = "inset 0px -3px 0px rgba(0,0,0,0.2)";
        el.appendChild(b);
    });
}

// ==========================================
// [설정] 블록 왼쪽 위 모서리 기준 미세 조정값
// ==========================================
const VISUAL_OFFSET_Y = 120; // 손가락 위로 띄우는 높이

// 이제 '손가락'이 아니라 '블록의 왼쪽 위 모서리'가 기준입니다.
// 값 0, 0 이면 정확히 블록 모서리 위치를 가리킵니다.
// 조금 더 안쪽(중심)을 가리키게 하려면 양수(+)를 입력하세요.
const OFFSET_CONFIG = {
    // 9x9 (칸 작음): 반 칸 정도 안쪽으로
    9: { x: 20, y: 20 }, 

    // 8x8 (중간):
    8: { x: 25, y: 25 }, 

    // 7x7 (칸 큼):
    7: { x: 30, y: 30 }  
};

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    source.onmousedown = source.ontouchstart = null;

    const getPos = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: t.clientX, y: t.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        
        ghost.innerHTML = source.innerHTML;
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        const rect = ghost.getBoundingClientRect();
        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
        source.style.opacity = '0';

        const moveHandler = (me) => move(me);
        const endHandler = (ee) => end(ee);

        function move(me) {
            if(source.style.opacity !== '0') return;
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            const r = ghost.getBoundingClientRect();
            updateGhostAndCheck(p.x, p.y, r.width, r.height, onDrop, false);
        }

        function end(ee) {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);

            if(source.style.opacity !== '0') return;
            const p = getPos(ee);
            const r = ghost.getBoundingClientRect();
            
            updateGhostAndCheck(p.x, p.y, r.width, r.height, onDrop, true);

            ghost.style.display = 'none';
            source.style.opacity = '1';
            clearHighlights();
        }

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchend', endHandler);
    };

    source.onmousedown = source.ontouchstart = start;
}

function clearHighlights() {
    const cells = document.querySelectorAll('.grid-container .cell');
    cells.forEach(c => c.classList.remove('highlight-valid'));
}

function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치 (손가락 위로 띄움) - 변경 없음
    const ghostLeft = fingerX - w / 2;
    const ghostTop = fingerY - VISUAL_OFFSET_Y - h / 2;

    ghost.style.left = ghostLeft + 'px';
    ghost.style.top = ghostTop + 'px';

    // 2. [핵심 변경] 판정 기준을 '블록의 왼쪽 위(ghostLeft)'로 변경
    const config = OFFSET_CONFIG[state.gridSize] || { x: 20, y: 20 };

    // 블록의 왼쪽 위 모서리 + 설정값 = 판정 위치
    // 이제 블록 너비(w)가 변해도 판정 위치는 항상 블록의 앞머리 쪽에 고정됩니다.
    const logicX = ghostLeft + config.x;
    const logicY = ghostTop + config.y;

    if (!isDropAction) {
        clearHighlights();
    }

    const idx = getMathGridIndex(logicX, logicY);

    if (idx !== -1) {
        onDrop(idx, !isDropAction);
    }
}

function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const pL = parseFloat(style.paddingLeft) || 0;
    const pT = parseFloat(style.paddingTop) || 0;
    const contentStartX = rect.left + pL;
    const contentStartY = rect.top + pT;
    const contentW = rect.width - pL - (parseFloat(style.paddingRight) || 0);
    const contentH = rect.height - pT - (parseFloat(style.paddingBottom) || 0);
    const relX = checkX - contentStartX;
    const relY = checkY - contentStartY;

    if (relX < -15 || relY < -15 || relX > contentW + 15 || relY > contentH + 15) return -1;

    const cellW = contentW / state.gridSize;
    const cellH = contentH / state.gridSize;
    const col = Math.floor(relX / cellW);
    const row = Math.floor(relY / cellH);

    if (col < 0 || col >= state.gridSize || row < 0 || row >= state.gridSize) return -1;
    return row * state.gridSize + col;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
