import { state } from "./game-data.js";

// 셀 크기 계산 (실시간)
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
        
        // [중요] 기존 클래스 유지하면서 초기화 (테두리 사라짐 방지)
        // highlight-valid 클래스는 드래그 중에만 js로 붙였다 떼므로 여기선 건드리지 않음
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
// [좌표 및 오차 보정 설정]
// ==========================================
// Y축: 손가락보다 120px 위에 블록을 띄움 (가림 방지)
const TOUCH_OFFSET_Y = 120; 

// X축: 손가락보다 왼쪽(-60px)을 기준으로 판정 (오른쪽 쏠림 해결)
// 이 값을 조절하여 좌우 위치를 맞출 수 있습니다.
const TOUCH_OFFSET_X = -60; 

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 이벤트 중복 등록 방지 (기존 핸들러 제거)
    source.ontouchstart = null;
    source.onmousedown = null;
    window.ontouchmove = null;
    window.onmousemove = null;
    window.ontouchend = null;
    window.onmouseup = null;

    const getPos = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: t.clientX, y: t.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        
        // 고스트 초기화
        ghost.innerHTML = source.innerHTML;
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        // 고스트 크기를 여기서 확실하게 잡음
        const rect = ghost.getBoundingClientRect();
        
        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
        
        source.style.opacity = '0';
    };

    const move = (e) => {
        if(source.style.opacity !== '0') return;
        if(e.cancelable) e.preventDefault(); 

        const pos = getPos(e);
        
        // 현재 고스트 크기 (반응형 대응)
        const rect = ghost.getBoundingClientRect();
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
    };

    const end = (e) => {
        if(source.style.opacity !== '0') return;
        
        const pos = getPos(e);
        const rect = ghost.getBoundingClientRect();
        
        // 최종 판정 (Drop)
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, true);

        ghost.style.display = 'none';
        source.style.opacity = '1';
        
        // 모든 하이라이트 제거
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    };

    // 이벤트 등록
    source.ontouchstart = start;
    source.onmousedown = start;
    
    // 윈도우 전체에 이벤트를 걸어서 드래그 끊김 방지
    window.ontouchmove = move;
    window.onmousemove = move;
    window.ontouchend = end;
    window.onmouseup = end;
}

// [핵심 함수] 위치 계산 및 판정
function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 고스트(보이는 블록) 위치 이동
    // 손가락 위치에 블록 중앙을 맞춤 (시각적으로는 손가락 바로 위)
    ghost.style.left = (fingerX - w / 2) + 'px';
    ghost.style.top = (fingerY - TOUCH_OFFSET_Y - h / 2) + 'px';

    // 2. 판정 기준점 계산 (여기가 핵심)
    // 사용자 시선에 맞춰 X축을 왼쪽으로 이동(TOUCH_OFFSET_X)
    const logicX = fingerX + TOUCH_OFFSET_X;
    const logicY = fingerY - TOUCH_OFFSET_Y;

    // 3. 하이라이트 초기화 (깜빡임 방지 위해 매번 실행)
    if (!isDropAction) {
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
    }

    // 4. 그리드 판정
    const idx = getMathGridIndex(logicX, logicY);

    if (idx !== -1) {
        // isDropAction: false(미리보기), true(놓기)
        onDrop(idx, !isDropAction);
    }
}

// [정밀 계산] 그리드 인덱스 찾기
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // 실제 셀 영역
    const contentStartX = rect.left + paddingLeft;
    const contentStartY = rect.top + paddingTop;
    const contentWidth = rect.width - paddingLeft - (parseFloat(style.paddingRight) || 0);
    const contentHeight = rect.height - paddingTop - (parseFloat(style.paddingBottom) || 0);

    // 좌표 변환
    const relativeX = checkX - contentStartX;
    const relativeY = checkY - contentStartY;

    // 범위 체크 (관대하게 10px 여유)
    if (relativeX < -10 || relativeY < -10 || relativeX > contentWidth + 10 || relativeY > contentHeight + 10) return -1;

    // 셀 인덱스 계산
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
