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
// [핵심 수정] 드래그 & 드롭 좌표 로직
// ==========================================
const TOUCH_OFFSET_Y = 120; // 손가락보다 120px 위에 블록을 띄움 (시야 확보)

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 터치/마우스 좌표 통합 추출
    const getClientPos = (e) => {
        const ptr = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: ptr.clientX, y: ptr.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        // e.preventDefault(); // 필요 시 주석 해제

        // 1. 고스트 블록 복제 및 표시
        ghost.innerHTML = source.innerHTML; 
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        // 고스트 크기 측정 (중앙 정렬용)
        const ghostRect = ghost.getBoundingClientRect();
        
        // 2. 위치 설정
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);
        
        // 3. 원본 숨김
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault(); // 드래그 중 스크롤 방지
        
        const pos = getClientPos(e);
        const ghostRect = ghost.getBoundingClientRect();
        
        // 시각적 위치 업데이트
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);

        // 하이라이트 초기화
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        // [중요] 판정은 "손가락 위치"가 아니라 "보정된(떠있는) 블록 위치"로 해야 함
        const targetX = pos.x; 
        const targetY = pos.y - TOUCH_OFFSET_Y; // 손가락보다 위쪽 좌표를 기준으로 판정

        const idx = getMathGridIndex(targetX, targetY);
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if (source.style.opacity !== '0') return;
        
        const pos = getClientPos(e);
        
        // 드롭 시에도 동일하게 보정된 좌표 사용
        const targetX = pos.x;
        const targetY = pos.y - TOUCH_OFFSET_Y;

        ghost.style.display = 'none'; 
        source.style.opacity = '1';
        
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        const idx = getMathGridIndex(targetX, targetY);
        if(idx !== -1) onDrop(idx, false);
    };

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// [위치 보정] 블록을 손가락 위로 띄우고, 좌우 중앙 정렬
function updateGhostPosition(clientX, clientY, width, height) {
    const ghost = document.getElementById('ghost');
    
    // X축: 블록의 절반만큼 왼쪽으로 이동 -> 블록 중앙이 손가락에 옴
    const centeredX = clientX - (width / 2);
    
    // Y축: 지정된 오프셋만큼 위로 올리고, 높이 절반만큼 더 올려서 중앙 정렬 느낌
    // (여기서는 오프셋만큼만 띄우는 게 시각적으로 더 자연스러움)
    const centeredY = clientY - TOUCH_OFFSET_Y - (height / 2);

    ghost.style.left = centeredX + 'px';
    ghost.style.top = centeredY + 'px';
}

// [판정 로직] 화면상의 절대 좌표(떠 있는 블록 위치)를 그리드 인덱스로 변환
function getMathGridIndex(checkX, checkY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();

    // 그리드 영역 내부 좌표 계산
    const x = checkX - rect.left;
    const y = checkY - rect.top;

    // 보드 범위 밖인지 체크 (약간의 여유 범위 10px 허용)
    if (x < -10 || y < -10 || x > rect.width + 10 || y > rect.height + 10) return -1;

    const cellSizeX = rect.width / state.gridSize;
    const cellSizeY = rect.height / state.gridSize;
    
    const col = Math.floor(x / cellSizeX);
    const row = Math.floor(y / cellSizeY);

    // 유효한 그리드 인덱스인지 확인
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
