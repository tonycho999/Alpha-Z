import { state } from "./game-data.js";

// 셀 크기 실시간 계산 (보드 크기에 맞춰 자동 조절)
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
        
        // 기존 하이라이트 유지 (깜빡임 방지)
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
// [자석 흡착 설정]
// ==========================================
const VISUAL_OFFSET_Y = 120; // 손가락보다 120px 위에 띄워서 보여줌

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
        
        // 고스트의 실제 크기 측정
        const rect = ghost.getBoundingClientRect();
        
        const pos = getPos(e);
        updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);
        source.style.opacity = '0';

        // 전역 이벤트 리스너 등록
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

// [자석 로직의 핵심 함수]
function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');

    // 1. 시각적 위치 업데이트 (손가락 위 120px)
    // 블록의 정중앙(w/2, h/2)이 손가락 위치에 오도록 배치
    const visualLeft = fingerX - (w / 2);
    const visualTop = fingerY - VISUAL_OFFSET_Y - (h / 2);

    ghost.style.left = visualLeft + 'px';
    ghost.style.top = visualTop + 'px';

    // 2. 자석 흡착 계산
    // 손가락 위치(fingerX, fingerY - Offset)가 그리드의 어느 칸 '중심'에 가장 가까운지 찾습니다.
    const magnetTargetX = fingerX;
    const magnetTargetY = fingerY - VISUAL_OFFSET_Y;

    if (!isDropAction) {
        clearHighlights();
    }

    const idx = getMagnetGridIndex(magnetTargetX, magnetTargetY);

    if (idx !== -1) {
        onDrop(idx, !isDropAction);
    }
}

// [핵심] 가장 가까운 칸 찾기 (Magnet Logic)
function getMagnetGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const pL = parseFloat(style.paddingLeft) || 0;
    const pT = parseFloat(style.paddingTop) || 0;

    // 그리드 내부의 순수 콘텐츠 영역 시작점
    const contentStartX = rect.left + pL;
    const contentStartY = rect.top + pT;
    const contentW = rect.width - pL - (parseFloat(style.paddingRight) || 0);
    const contentH = rect.height - pT - (parseFloat(style.paddingBottom) || 0);

    // 칸 하나의 크기
    const cellSizeX = contentW / state.gridSize;
    const cellSizeY = contentH / state.gridSize;

    // [자석 원리]
    // 내 손가락 위치(checkX, checkY)가 그리드 시작점으로부터 몇 번째 칸만큼 떨어져 있는지 계산
    // Math.round()를 쓰면 1.9칸 -> 2칸, 1.1칸 -> 1칸으로 '반올림' 되어 가장 가까운 칸으로 붙습니다.
    
    // 1. 현재 손가락이 가리키는 '중심 칸'의 행/열을 구함
    const rawCol = (checkX - contentStartX) / cellSizeX;
    const rawRow = (checkY - contentStartY) / cellSizeY;
    
    // 보드판 밖으로 너무 멀리 나가면(-1칸 이상 차이) 무효 처리
    if (rawCol < -1 || rawCol > state.gridSize || rawRow < -1 || rawRow > state.gridSize) return -1;

    const centerCol = Math.round(rawCol - 0.5); // 0.5 보정은 좌표계 일치를 위해 필요할 수 있음 (보통 Math.round(rawCol)이나 floor 사용)
    // 여기서는 가장 직관적인 좌표계: (현재위치 / 셀크기)를 반올림하면 가장 가까운 정수 인덱스가 나옴
    let targetCol = Math.floor(rawCol);
    let targetRow = Math.floor(rawRow);

    // *중요*: 지금 잡고 있는 블록의 모양(너비/높이)을 고려해야 함
    // 우리는 블록의 '중심'을 잡고 있으므로, 블록의 '왼쪽 위(0,0)'가 어디로 갈지 역산해야 함
    const blockWidthCells = state.currentBlock.shape.w;
    const blockHeightCells = state.currentBlock.shape.h;

    // 보정: 손가락은 블록의 중심에 있다.
    // 그러므로 그리드의 시작점(Drop Index)은 중심에서 (너비/2, 높이/2)만큼 왼쪽/위로 가야 한다.
    targetCol = Math.floor(rawCol - (blockWidthCells / 2) + 0.5); 
    targetRow = Math.floor(rawRow - (blockHeightCells / 2) + 0.5);

    // 범위 체크 (블록의 일부라도 걸치면 허용할지, 아니면 시작점이 안에 있어야 할지 결정)
    // 여기서는 시작점이 유효 범위 내에 있는지 느슨하게 체크
    if (targetCol < -2 || targetCol >= state.gridSize + 1 || targetRow < -2 || targetRow >= state.gridSize + 1) return -1;

    // 최종 인덱스 반환 (음수나 범위 초과는 handleDropAttempt에서 필터링됨)
    // 여기서는 단순히 계산된 '왼쪽 위 좌표'를 넘김
    return targetRow * state.gridSize + targetCol;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
