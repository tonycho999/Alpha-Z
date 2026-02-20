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
// [설정] 난이도(Grid Size)별 오프셋 개별 정의
// ==========================================
const VISUAL_OFFSET_Y = 120; // 시각적으로 띄우는 높이 (공통)

// 값이 클수록 왼쪽(X), 위쪽(Y)으로 더 많이 이동합니다.
// 7x7은 칸이 크니까 더 많이 이동시켜야 중앙이 맞을 수 있습니다.
const OFFSET_CONFIG = {
    // [Key: gridSize] : { x: 왼쪽이동픽셀, y: 위쪽이동픽셀 }
    
    // 9x9 (HARD): 칸이 작음 -> 적당히 이동
    9: { x: -60, y: -60 }, 

    // 8x8 (NORMAL): 중간
    8: { x: -70, y: -70 }, 

    // 7x7 (EASY): 칸이 큼 -> 더 많이 이동해야 왼쪽 귀퉁이에 맞음
    7: { x: -85, y: -80 }  
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

    // 1. 시각적 위치
    ghost.style.left = (fingerX - w / 2) + 'px';
    ghost.style.top = (fingerY - VISUAL_OFFSET_Y - h / 2) + 'px';

    // 2. [핵심 수정] 현재 그리드 사이즈에 맞는 오프셋 값 가져오기
    // 기본값은 -60으로 설정 (혹시 모를 오류 방지)
    const config = OFFSET_CONFIG[state.gridSize] || { x: -60, y: -60 };

    const logicX = fingerX + config.x;
    const logicY = fingerY - VISUAL_OFFSET_Y + config.y;

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
