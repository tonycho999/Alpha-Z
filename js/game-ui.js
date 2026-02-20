import { state } from "./game-data.js";

// 셀 크기 계산 (기본값 방어코드 포함)
function getActualCellSize() {
    const sample = document.querySelector('.grid-container .cell');
    return sample ? sample.getBoundingClientRect().width : 45;
}

export function renderGrid() {
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        const char = state.grid[i];
        cell.className = 'cell'; cell.textContent = ''; cell.style.transform = ''; cell.style.opacity = '1';
        cell.style.border = 'none';
        if(char) {
            cell.textContent = char; cell.classList.add(`b-${char}`);
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
// [수정 완료] 드래그 & 드롭 좌표 정밀 보정
// ==========================================
const TOUCH_OFFSET_Y = 100; // 손가락보다 100px 위에 블록 표시 (시야 확보)

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    const getClientPos = (e) => {
        const ptr = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: ptr.clientX, y: ptr.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        
        // 1. 고스트 표시
        ghost.innerHTML = source.innerHTML; 
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        const ghostRect = ghost.getBoundingClientRect();
        
        // 2. 위치 잡기
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);
        
        // 3. 원본 숨김
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault(); 
        
        const pos = getClientPos(e);
        const ghostRect = ghost.getBoundingClientRect();
        
        // 시각적 위치 업데이트
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);

        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        // [판정] 시각적으로 보이는 블록의 중심점을 기준으로 판정
        const visualCenterX = pos.x;
        const visualCenterY = pos.y - TOUCH_OFFSET_Y; 

        const idx = getMathGridIndex(visualCenterX, visualCenterY);
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if (source.style.opacity !== '0') return;
        
        const pos = getClientPos(e);
        const visualCenterX = pos.x;
        const visualCenterY = pos.y - TOUCH_OFFSET_Y;

        ghost.style.display = 'none'; 
        source.style.opacity = '1';
        
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        const idx = getMathGridIndex(visualCenterX, visualCenterY);
        if(idx !== -1) onDrop(idx, false);
    };

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// 블록을 손가락 위로 띄우고 중앙 정렬
function updateGhostPosition(clientX, clientY, width, height) {
    const ghost = document.getElementById('ghost');
    // 블록의 정중앙이 (손가락X, 손가락Y - 100px) 위치에 오도록 배치
    const centeredX = clientX - (width / 2);
    const centeredY = clientY - TOUCH_OFFSET_Y - (height / 2);

    ghost.style.left = centeredX + 'px';
    ghost.style.top = centeredY + 'px';
}

// [핵심 보정 로직] 패딩(padding)을 고려한 정확한 그리드 인덱스 계산
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);

    // CSS에 설정된 padding 값을 가져와서 계산에서 제외함 (오차 해결의 열쇠!)
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // 실제 셀들이 있는 내부 영역의 시작점
    const contentStartX = rect.left + paddingLeft;
    const contentStartY = rect.top + paddingTop;
    
    // 내부 영역의 실제 크기
    const contentWidth = rect.width - paddingLeft - (parseFloat(style.paddingRight) || 0);
    const contentHeight = rect.height - paddingTop - (parseFloat(style.paddingBottom) || 0);

    // 좌표 변환 (그리드 내부 기준 상대 좌표)
    const relativeX = checkX - contentStartX;
    const relativeY = checkY - contentStartY;

    // 범위 체크 (약간의 여유 5px 허용)
    if (relativeX < -5 || relativeY < -5 || relativeX > contentWidth + 5 || relativeY > contentHeight + 5) return -1;

    // 셀 크기 계산 (Gap 포함된 평균 크기)
    const cellSizeX = contentWidth / state.gridSize;
    const cellSizeY = contentHeight / state.gridSize;
    
    const col = Math.floor(relativeX / cellSizeX);
    const row = Math.floor(relativeY / cellSizeY);

    if (col < 0 || col >= state.gridSize || row < 0 || row >= state.gridSize) return -1;
    
    return row * state.gridSize + col;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
    if (state.isAdmin) {
        const ad = document.getElementById('ad-container');
        if (ad) ad.classList.add('admin-no-ad');
    }
}
