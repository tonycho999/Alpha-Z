import { state } from "./game-data.js";

// 셀 크기 계산
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
// [수정 완료] 보이는 위치 그대로 판정 (WYSIWYG)
// ==========================================
const TOUCH_OFFSET_Y = 100; // 손가락과 블록 사이의 시각적 거리

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
        
        // 2. 초기 위치 잡기
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);
        
        // 3. 원본 숨김
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault(); 
        
        const pos = getClientPos(e);
        
        // [중요] 1. 먼저 고스트 블록을 이동시킴
        // 고스트의 크기(scale된 크기)를 매번 체크하여 정확도 향상
        const currentGhostRect = ghost.getBoundingClientRect();
        updateGhostPosition(pos.x, pos.y, currentGhostRect.width, currentGhostRect.height);

        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        // [핵심 수정] 2. 이동된 고스트의 "실제 화면상 중심 좌표"를 구함
        // 계산식이 아니라, 현재 화면에 그려진 박스의 좌표를 그대로 가져옴
        const updatedRect = ghost.getBoundingClientRect();
        const visualCenterX = updatedRect.left + (updatedRect.width / 2);
        const visualCenterY = updatedRect.top + (updatedRect.height / 2);

        // 3. 그 좌표로 그리드 판정
        const idx = getMathGridIndex(visualCenterX, visualCenterY);
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if (source.style.opacity !== '0') return;
        
        // 드롭 시점에도 "현재 화면에 떠 있는 고스트의 위치"를 기준으로 판정
        const finalRect = ghost.getBoundingClientRect();
        const visualCenterX = finalRect.left + (finalRect.width / 2);
        const visualCenterY = finalRect.top + (finalRect.height / 2);

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

// 블록 시각적 위치 업데이트
function updateGhostPosition(clientX, clientY, width, height) {
    const ghost = document.getElementById('ghost');
    
    // transform: scale(1.1) 때문에 getBoundingClientRect의 width/height는 커져 있음
    // 하지만 style.left/top은 scale 전 기준일 수 있으므로 보정
    
    const centeredX = clientX - (width / 2);
    // 높이만큼 위로 올리고, 추가 오프셋 적용
    const centeredY = clientY - TOUCH_OFFSET_Y - (height / 2);

    ghost.style.left = centeredX + 'px';
    ghost.style.top = centeredY + 'px';
}

// 그리드 인덱스 계산 (패딩 보정 포함)
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    const contentStartX = rect.left + paddingLeft;
    const contentStartY = rect.top + paddingTop;
    
    const contentWidth = rect.width - paddingLeft - (parseFloat(style.paddingRight) || 0);
    const contentHeight = rect.height - paddingTop - (parseFloat(style.paddingBottom) || 0);

    const relativeX = checkX - contentStartX;
    const relativeY = checkY - contentStartY;

    // 약간의 여유 범위
    if (relativeX < -5 || relativeY < -5 || relativeX > contentWidth + 5 || relativeY > contentHeight + 5) return -1;

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
