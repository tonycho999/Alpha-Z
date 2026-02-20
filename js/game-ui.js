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
        const char = state.grid[i];
        
        // [중요 수정] highlight-valid 클래스는 드래그 로직에서 관리하므로 함부로 지우지 않음
        // 기존 블록 컬러 클래스들(b-A, b-B 등)만 정밀하게 교체
        const isHighlighted = cell.classList.contains('highlight-valid');
        cell.className = 'cell'; 
        if (isHighlighted) cell.classList.add('highlight-valid');
        
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';
        cell.style.border = 'none';

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
// [보정 설정] 판정 지점 좌상단 이동
// ==========================================
const VISUAL_OFFSET_Y = 120; 
const LOGIC_SHIFT_X = -60; // 왼쪽 시프트 값 (체감상 더 정확하게 조정)
const LOGIC_SHIFT_Y = -50; // 위쪽 시프트 값

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 기존 이벤트 완전 제거 (클린업)
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

        // 윈도우 전역 리스너 등록 (드래그 끊김 방지)
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    };

    const move = (e) => {
        if(source.style.opacity !== '0') return;
        if(e.cancelable) e.preventDefault(); 

        const pos = getPos(e);
        const rect = ghost.getBoundingClientRect();
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
    };

    const end = (e) => {
        // 전역 리스너 제거
        window.removeEventListener('mousemove', move);
        window.removeEventListener('touchmove', move);
        window.removeEventListener('mouseup', end);
        window.removeEventListener('touchend', end);

        if(source.style.opacity !== '0') return;
        const pos = getPos(e);
        const rect = ghost.getBoundingClientRect();
        
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, true);

        ghost.style.display = 'none';
        source.style.opacity = '1';
        
        // 하이라이트 즉시 청소
        clearHighlights();
    };

    source.onmousedown = source.ontouchstart = start;
}

function clearHighlights() {
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(c => c.classList.remove('highlight-valid'));
}

function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치
    ghost.style.left = (fingerX - w / 2) + 'px';
    ghost.style.top = (fingerY - VISUAL_OFFSET_Y - h / 2) + 'px';

    // 2. 판정 지점 (공중 블록의 좌측 상단으로 이동)
    const logicX = fingerX + LOGIC_SHIFT_X;
    const logicY = fingerY - VISUAL_OFFSET_Y + LOGIC_SHIFT_Y;

    // 3. 하이라이트 초기화
    if (!isDropAction) {
        clearHighlights();
    }

    // 4. 그리드 판정
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
