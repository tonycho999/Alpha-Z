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
        cell.className = 'cell'; 
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
// [극단적 보정] 판정 지점 좌상단 강제 이동
// ==========================================
const VISUAL_OFFSET_Y = 120; // 블록이 손가락 위로 떠 있는 높이

// [대폭 수정] 테두리가 블록의 왼쪽 위로 팍 튀어나오도록 값을 키웠습니다.
const LOGIC_SHIFT_X = -40;  // 왼쪽으로 100px 강제 이동
const LOGIC_SHIFT_Y = -30;   // 위쪽으로 80px 강제 이동

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 이벤트 리스너 중복 방지를 위한 초기화
    source.ontouchstart = source.onmousedown = null;
    window.ontouchmove = window.onmousemove = null;
    window.ontouchend = window.onmouseup = null;

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
    };

    const move = (e) => {
        if(source.style.opacity !== '0') return;
        if(e.cancelable) e.preventDefault(); 

        const pos = getPos(e);
        const rect = ghost.getBoundingClientRect();
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
    };

    const end = (e) => {
        if(source.style.opacity !== '0') return;
        const pos = getPos(e);
        const rect = ghost.getBoundingClientRect();
        
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, true);

        ghost.style.display = 'none';
        source.style.opacity = '1';
        
        // 모든 하이라이트 즉시 제거
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(c => c.classList.remove('highlight-valid'));
    };

    source.ontouchstart = start;
    source.onmousedown = start;
    window.ontouchmove = move;
    window.onmousemove = move;
    window.ontouchend = end;
    window.onmouseup = end;
}

function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치 (손가락 위 120px)
    ghost.style.left = (fingerX - w / 2) + 'px';
    ghost.style.top = (fingerY - VISUAL_OFFSET_Y - h / 2) + 'px';

    // 2. 판정 지점 (Logic Point) 계산
    // 눈에 보이는 블록의 중심에서 좌상단으로 크게 이동시켜 판정
    const logicX = fingerX + LOGIC_SHIFT_X;
    const logicY = fingerY - VISUAL_OFFSET_Y + LOGIC_SHIFT_Y;

    // 3. 하이라이트 초기화 (매 프레임 강제 실행)
    if (!isDropAction) {
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(c => c.classList.remove('highlight-valid'));
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
    
    // 매번 실시간 위치 측정
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

    // 판정 허용 범위 (보드판 바깥 약간까지 인정)
    if (relX < -20 || relY < -20 || relX > contentW + 20 || relY > contentH + 20) return -1;

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
