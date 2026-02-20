import { state } from "./game-data.js";

// 셀 크기 계산 (매번 실시간 측정)
function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    
    // 순수 내용물 너비 / 칸 수
    return (rect.width - paddingLeft - paddingRight) / state.gridSize;
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
// [완벽 보정] 실시간 좌표 추적 시스템
// ==========================================
const DRAG_Y_OFFSET = 100; // 손가락보다 100px 위를 기준점으로 잡음

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 터치/마우스 좌표 추출
    const getPos = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: t.clientX, y: t.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        
        // 고스트 준비
        ghost.innerHTML = source.innerHTML;
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, onDrop, false); // 미리보기 모드(false)
        
        source.style.opacity = '0';
    };

    const move = (e) => {
        if(source.style.opacity !== '0') return;
        if(e.cancelable) e.preventDefault(); // 드래그 중 화면 흔들림 방지

        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, onDrop, false); // 미리보기 모드
    };

    const end = (e) => {
        if(source.style.opacity !== '0') return;
        const pos = getPos(e);
        
        // 최종 판정 (Drop)
        updateGhostAndCheck(pos.x, pos.y, onDrop, true); // 드롭 모드(true)

        ghost.style.display = 'none';
        source.style.opacity = '1';
        
        // 하이라이트 제거
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    };

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// [핵심 함수] 시각적 위치 이동 + 논리적 그리드 판정 동시 수행
function updateGhostAndCheck(fingerX, fingerY, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 고스트의 현재 크기를 실시간 측정 (줌/스크롤 변화 대응)
    const ghostRect = ghost.getBoundingClientRect();
    const w = ghostRect.width;
    const h = ghostRect.height;

    // 2. 기준점 계산 (손가락보다 100px 위)
    const targetX = fingerX;
    const targetY = fingerY - DRAG_Y_OFFSET;

    // 3. 고스트 이동 (기준점이 블록의 정중앙에 오도록)
    ghost.style.left = (targetX - w / 2) + 'px';
    ghost.style.top = (targetY - h / 2) + 'px';

    // 4. 하이라이트 초기화 (이동 중 잔상 제거)
    if (!isDropAction) {
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    }

    // 5. 그리드 판정 (기준점 좌표 그대로 사용)
    const idx = getMathGridIndex(targetX, targetY);

    if (idx !== -1) {
        // isDropAction이 false면 미리보기(Highlight), true면 실제 배치(Place)
        onDrop(idx, !isDropAction);
    }
}

// [정밀 계산] 패딩과 스크롤을 모두 고려한 그리드 인덱스 찾기
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    // 매 순간 그리드의 위치를 새로 잰다 (오차 원천 봉쇄)
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // 실제 블록이 놓일 내부 영역 계산
    const contentStartX = rect.left + paddingLeft;
    const contentStartY = rect.top + paddingTop;
    
    // 우측/하단 패딩까지 뺀 순수 컨텐츠 크기
    const contentWidth = rect.width - paddingLeft - (parseFloat(style.paddingRight) || 0);
    const contentHeight = rect.height - paddingTop - (parseFloat(style.paddingBottom) || 0);

    // 좌표 변환 (그리드 내부 기준 상대 좌표)
    const relativeX = checkX - contentStartX;
    const relativeY = checkY - contentStartY;

    // 범위 체크 (5px 여유 허용)
    if (relativeX < -5 || relativeY < -5 || relativeX > contentWidth + 5 || relativeY > contentHeight + 5) return -1;

    // 셀 크기 계산
    const cellSizeX = contentWidth / state.gridSize;
    const cellSizeY = contentHeight / state.gridSize;
    
    const col = Math.floor(relativeX / cellSizeX);
    const row = Math.floor(relativeY / cellSizeY);

    // 유효성 검사
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
