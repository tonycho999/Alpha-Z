import { state } from "./game-data.js";

// [보조 함수] 현재 보드판 상태를 기준으로 칸 하나의 크기를 구함 (실시간)
function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45;
    
    const rect = grid.getBoundingClientRect(); // 현재 보드 크기 측정
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    
    // (보드 전체 너비 - 패딩) / 칸 수
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
    
    // 렌더링 시점의 크기 (참고용일 뿐, 드래그 시점에 다시 계산됨)
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
// [설정] 드래그 & 자석 보정
// ==========================================
const VISUAL_OFFSET_Y = 120; // 손가락 위로 띄우는 높이

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 기존 리스너 제거 (중복 방지)
    source.onmousedown = source.ontouchstart = null;

    const getPos = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: t.clientX, y: t.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        
        // 1. 고스트 내용 복사
        ghost.innerHTML = source.innerHTML;
        ghost.style.display = 'grid';

        // [핵심 해결책]
        // 주소창 등에 의해 보드 크기가 변했을 수 있으므로, 
        // 드래그를 시작하는 '지금 이 순간'의 셀 크기를 다시 계산해서 적용합니다.
        const currentCellSize = getActualCellSize();
        
        // 고스트(드래그 블록)의 크기를 현재 보드판 비율에 강제로 맞춤
        ghost.style.gridTemplateColumns = `repeat(${state.currentBlock.shape.w}, ${currentCellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${state.currentBlock.shape.h}, ${currentCellSize}px)`;
        
        // 필요하다면 폰트 사이즈도 보정 (선택 사항)
        // Array.from(ghost.children).forEach(c => c.style.fontSize = (currentCellSize * 0.5) + 'px');

        // 2. 크기가 보정된 고스트의 실제 크기 측정
        const rect = ghost.getBoundingClientRect();
        
        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
        source.style.opacity = '0';

        // 전역 이벤트 리스너
        const moveHandler = (me) => move(me);
        const endHandler = (ee) => end(ee);

        function move(me) {
            if(source.style.opacity !== '0') return;
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            // 이동 중에도 크기가 변할 수 있으니 rect를 계속 갱신
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

// 자석 위치 계산 및 시각적 업데이트
function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치: 손가락 위에 블록 정중앙이 오도록
    const visualLeft = fingerX - (w / 2);
    const visualTop = fingerY - VISUAL_OFFSET_Y - (h / 2);

    ghost.style.left = visualLeft + 'px';
    ghost.style.top = visualTop + 'px';

    // 2. 자석 판정: 손가락 위치를 기준으로 가장 가까운 칸 찾기
    const idx = getMagnetGridIndex(fingerX, fingerY - VISUAL_OFFSET_Y);

    if (!isDropAction) {
        clearHighlights();
    }

    if (idx !== -1) {
        onDrop(idx, !isDropAction);
    }
}

// [자석 로직] 가장 가까운 칸 찾기 (반올림 방식)
function getMagnetGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    // 매번 실시간 측정 (절대값 아님)
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

    // 현재 손가락 위치가 그리드 상에서 몇 번째 칸인지 (실수 형태)
    const rawCol = (checkX - contentStartX) / cellSizeX;
    const rawRow = (checkY - contentStartY) / cellSizeY;

    // 보드 밖 너무 멀리 벗어남 체크
    if (rawCol < -2 || rawCol > state.gridSize + 1 || rawRow < -2 || rawRow > state.gridSize + 1) return -1;

    // 블록의 중심을 잡고 있으므로, 블록의 '왼쪽 위' 좌표를 역산
    // Math.round를 사용해 가장 가까운 정수 칸으로 '자석'처럼 붙임
    const blockW = state.currentBlock.shape.w;
    const blockH = state.currentBlock.shape.h;

    const targetCol = Math.round(rawCol - (blockW / 2));
    const targetRow = Math.round(rawRow - (blockH / 2));

    // 유효 범위 체크 (걸치는 것 허용 여부에 따라 조절 가능)
    // 여기서는 중심점이 유효 범위 근처일 때만 허용
    if (targetCol < -2 || targetCol >= state.gridSize || targetRow < -2 || targetRow >= state.gridSize) return -1;
    
    // 최종 인덱스가 음수여도 highlight 로직 등에서 걸러짐, 일단 좌표 반환
    return targetRow * state.gridSize + targetCol;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
