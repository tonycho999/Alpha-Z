import { state } from "./game-data.js";

// [수정 1] 셀 크기를 DOM 요소가 아니라 '수학적'으로 계산 (오차 원인 제거)
function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45; // 기본값
    // 보드 전체 너비를 칸 수로 나누어 정확한 1칸 크기를 구함
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const contentWidth = rect.width - paddingLeft - paddingRight;
    
    return contentWidth / state.gridSize;
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
// [수정 2] 고정 오프셋 및 정확한 좌표 계산 로직
// ==========================================
const TOUCH_OFFSET_Y = 100; // 손가락보다 100px 위에 블록 표시

// 드래그 시작 시점의 블록 크기를 저장할 변수
let dragMeta = { w: 0, h: 0 };

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
        
        // [중요] 시작할 때 딱 한 번만 크기를 잽니다. (이동 중에 재면 오차 발생)
        const ghostRect = ghost.getBoundingClientRect();
        dragMeta.w = ghostRect.width;
        dragMeta.h = ghostRect.height;
        
        // 2. 초기 위치 잡기
        const pos = getClientPos(e);
        updateGhostAndCheck(pos.x, pos.y, onDrop, false); // false = 드롭 아님
        
        // 3. 원본 숨김
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault(); // 스크롤 방지
        const pos = getClientPos(e);
        updateGhostAndCheck(pos.x, pos.y, onDrop, false);
    };

    const end = (e) => {
        if (source.style.opacity !== '0') return;
        const pos = getClientPos(e);
        
        // 마지막 판정 실행
        updateGhostAndCheck(pos.x, pos.y, onDrop, true); // true = 드롭 시도

        ghost.style.display = 'none'; 
        source.style.opacity = '1';
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    };

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// [수정 3] 시각적 위치 업데이트와 논리적 판정을 동시에 수행
function updateGhostAndCheck(fingerX, fingerY, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치: 블록의 '정중앙'이 '손가락 - 100px' 위치에 오도록 배치
    const visualCenterX = fingerX;
    const visualCenterY = fingerY - TOUCH_OFFSET_Y;

    // 실제 div의 left, top은 좌상단 기준이므로 너비/높이 절반을 빼줌
    ghost.style.left = (visualCenterX - dragMeta.w / 2) + 'px';
    ghost.style.top = (visualCenterY - dragMeta.h / 2) + 'px';

    // 2. 하이라이트 초기화
    if (!isDropAction) {
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    }

    // 3. 판정: "눈에 보이는 블록의 중심점(visualCenterX, Y)"을 기준으로 그리드 찾기
    const idx = getMathGridIndex(visualCenterX, visualCenterY);

    if (idx !== -1) {
        onDrop(idx, !isDropAction); // isDropAction이 false면 미리보기(true), true면 실제배치(false)
    }
}

// [수정 4] 패딩을 고려한 정밀 계산 로직 (흔들림 없음)
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // 실제 셀 영역의 시작점과 크기
    const contentStartX = rect.left + paddingLeft;
    const contentStartY = rect.top + paddingTop;
    const contentWidth = rect.width - paddingLeft - (parseFloat(style.paddingRight) || 0);
    const contentHeight = rect.height - paddingTop - (parseFloat(style.paddingBottom) || 0);

    // 좌표 변환
    const relativeX = checkX - contentStartX;
    const relativeY = checkY - contentStartY;

    // 범위 체크 (여유 5px)
    if (relativeX < -5 || relativeY < -5 || relativeX > contentWidth + 5 || relativeY > contentHeight + 5) return -1;

    // 셀 크기 계산 (전체 너비 / 갯수) -> getActualCellSize와 논리 동일
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
