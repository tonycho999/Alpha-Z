import { state } from "./game-data.js";

function getActualCellSize() {
    const sample = document.querySelector('.grid-container .cell');
    return sample ? sample.getBoundingClientRect().width : 45; // 기본값 수정
}

export function renderGrid() {
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        const char = state.grid[i];
        cell.className = 'cell'; cell.textContent = ''; cell.style.transform = ''; cell.style.opacity = '1';
        cell.style.border = 'none'; // 초기화
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
    const size = elementId === 'next-preview' ? 25 : getActualCellSize(); // 미리보기는 좀 작게
    el.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
    
    block.items.forEach((char, i) => {
        const b = document.createElement('div');
        b.className = `cell b-${char}`;
        b.style.fontSize = elementId === 'next-preview' ? '0.8rem' : '1.3rem';
        b.textContent = char;
        b.style.gridColumnStart = block.shape.map[i][1] + 1;
        b.style.gridRowStart = block.shape.map[i][0] + 1;
        // 소스 블록은 그림자 효과를 조금 줄여서 보드 위의 블록과 구분
        if(elementId !== 'next-preview') b.style.boxShadow = "inset 0px -3px 0px rgba(0,0,0,0.2)";
        el.appendChild(b);
    });
}

// [수정] 조작감 개선: Block Blast 스타일 (Offset 적용 및 즉각 반응)
export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    // 모바일/PC 공통 좌표 추출 함수
    const getClientPos = (e) => {
        const ptr = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
        return { x: ptr.clientX, y: ptr.clientY };
    };

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        e.preventDefault(); // 스크롤 방지

        // 1. 고스트 블록 준비
        ghost.innerHTML = source.innerHTML; 
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        // 2. 초기 위치 설정 (터치한 곳보다 위로 100px)
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y);
        
        // 3. 소스 숨기기
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault();
        
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y);

        // 하이라이트 제거
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        // 보드 위 충돌 체크 (Offset 적용된 위치 기준)
        const idx = getMathGridIndex(pos.x, pos.y);
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if (source.style.opacity !== '0') return;
        
        const pos = getClientPos(e);
        ghost.style.display = 'none'; 
        source.style.opacity = '1';
        
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        const idx = getMathGridIndex(pos.x, pos.y);
        if(idx !== -1) onDrop(idx, false);
    };

    // 이벤트 등록
    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// [수정] 고스트 위치 업데이트 (손가락 위 100px에 고정)
function updateGhostPosition(clientX, clientY) {
    const ghost = document.getElementById('ghost');
    // Block Blast 느낌: 손가락보다 확실히 위에 있어서 가리지 않음
    const offsetY = 100; 
    ghost.style.left = clientX + 'px';
    ghost.style.top = (clientY - offsetY) + 'px';
}

// [수정] 좌표 계산 로직 (Offset 반영)
function getMathGridIndex(clientX, clientY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const offsetY = 100; // 위에서 설정한 값과 동일해야 함

    // 실제 블록이 떠있는 위치(손가락 - 100px)를 기준으로 판정
    const checkX = clientX;
    const checkY = clientY - offsetY;

    const x = checkX - rect.left;
    const y = checkY - rect.top;

    // 보드 범위 밖 판정 (여유 범위 10px)
    if (x < -10 || y < -10 || x > rect.width + 10 || y > rect.height + 10) return -1;

    const cellSizeX = rect.width / state.gridSize;
    const cellSizeY = rect.height / state.gridSize;
    
    const col = Math.floor(x / cellSizeX);
    const row = Math.floor(y / cellSizeY);

    if (col < 0 || col >= state.gridSize || row < 0 || row >= state.gridSize) return -1;
    return row * state.gridSize + col;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
    
    // 어드민인 경우 광고 컨테이너 숨김
    if (state.isAdmin) {
        const ad = document.getElementById('ad-container');
        if (ad) ad.classList.add('admin-no-ad');
    }
}
