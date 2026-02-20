import { state } from "./game-data.js";

// 셀 크기 실시간 계산
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
// [설정] 난이도별 미세 조정 (여기서 수정하세요!)
// ==========================================
const VISUAL_OFFSET_Y = 120; // 시각적으로 띄우는 높이

const OFFSET_CONFIG = {
    // x: +값이면 오른쪽, -값이면 왼쪽으로 판정 이동
    // y: +값이면 아래쪽, -값이면 위쪽으로 판정 이동
    
    // 9x9 (HARD): 보통 0, 0이면 맞음
    9: { x: 0, y: 0 }, 

    // 8x8 (NORMAL): 만약 오른쪽으로 치우쳐 보이면 x를 -10 정도로 수정
    8: { x: -10, y: 10 }, 

    // 7x7 (EASY): 칸이 커서 오차가 클 수 있음. 필요하면 조절
    7: { x: 0, y: 0 }  
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

    // 1. 시각적 위치 (손가락 위 120px)
    // 블록의 정중앙이 손가락에 오도록 배치
    const visualLeft = fingerX - (w / 2);
    const visualTop = fingerY - VISUAL_OFFSET_Y - (h / 2);

    ghost.style.left = visualLeft + 'px';
    ghost.style.top = visualTop + 'px';

    if (!isDropAction) clearHighlights();

    // 2. [수정됨] 설정값을 가져와서 판정 좌표 보정
    const config = OFFSET_CONFIG[state.gridSize] || { x: 0, y: 0 };
    
    // 손가락 위치에 설정된 오프셋을 더함
    const magnetTargetX = fingerX + config.x;
    const magnetTargetY = fingerY - VISUAL_OFFSET_Y + config.y;

    // 3. 자석 판정 실행
    const idx = getMagnetGridIndex(magnetTargetX, magnetTargetY);

    if (idx !== -1) {
        onDrop(idx, !isDropAction);
    }
}

function getMagnetGridIndex(checkX, checkY) {
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

    const cellSizeX = contentW / state.gridSize;
    const cellSizeY = contentH / state.gridSize;

    // 현재 손가락(보정됨)이 가리키는 중심 칸 계산
    const rawCol = (checkX - contentStartX) / cellSizeX;
    const rawRow = (checkY - contentStartY) / cellSizeY;
    
    if (rawCol < -1 || rawCol > state.gridSize || rawRow < -1 || rawRow > state.gridSize) return -1;

    // 블록의 크기를 고려하여 '왼쪽 위 시작점'을 역산
    // Math.round를 사용하여 가장 가까운 칸으로 '착' 달라붙게 함
    const blockWidthCells = state.currentBlock.shape.w;
    const blockHeightCells = state.currentBlock.shape.h;

    const targetCol = Math.floor(rawCol - (blockWidthCells / 2) + 0.5); 
    const targetRow = Math.floor(rawRow - (blockHeightCells / 2) + 0.5);

    if (targetCol < -2 || targetCol >= state.gridSize + 1 || targetRow < -2 || targetRow >= state.gridSize + 1) return -1;

    return targetRow * state.gridSize + targetCol;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
