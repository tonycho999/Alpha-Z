import { state } from "./game-data.js";

// 셀 크기 계산 (없으면 기본값 45)
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

// [핵심 수정] 드래그 설정
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
        // e.preventDefault(); // 스크롤이 필요할 수 있으므로 상황에 따라 주석 처리

        // 1. 고스트 블록 준비
        ghost.innerHTML = source.innerHTML; 
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        // 고스트의 실제 크기를 측정 (중앙 정렬을 위해)
        const ghostRect = ghost.getBoundingClientRect();
        
        // 2. 초기 위치 설정
        const pos = getClientPos(e);
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);
        
        // 3. 소스 숨기기
        source.style.opacity = '0';
    };

    const move = (e) => {
        if (source.style.opacity !== '0') return;
        e.preventDefault(); // 드래그 중 화면 스크롤 방지
        
        const pos = getClientPos(e);
        // 현재 고스트의 크기를 가져옴
        const ghostRect = ghost.getBoundingClientRect();
        updateGhostPosition(pos.x, pos.y, ghostRect.width, ghostRect.height);

        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        // 중앙 좌표를 기준으로 판정
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

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

// [핵심 수정] 고스트 위치 업데이트 (손가락 위에 블록 중앙이 오도록)
function updateGhostPosition(clientX, clientY, width, height) {
    const ghost = document.getElementById('ghost');
    // 손가락보다 위로 띄울 간격 (가리지 않기 위함)
    const offsetY = 100; 
    
    // 블록의 가로/세로 중앙을 손가락 X좌표에 맞춤
    const centeredX = clientX - (width / 2);
    const centeredY = clientY - offsetY - (height / 2);

    ghost.style.left = centeredX + 'px';
    ghost.style.top = centeredY + 'px';
}

// [핵심 수정] 좌표 계산 로직 (시각적 위치와 논리적 위치 일치)
function getMathGridIndex(clientX, clientY) {
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const offsetY = 100; 

    // **중요**: 판정 기준점은 손가락 위치가 아니라, "보여지는 블록의 중심"이어야 함
    // updateGhostPosition에서 (clientY - offsetY)를 중심으로 잡았으므로,
    // 여기서도 동일한 Y위치를 기준으로 그리드와 비교해야 함.
    
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
    if (state.isAdmin) {
        const ad = document.getElementById('ad-container');
        if (ad) ad.classList.add('admin-no-ad');
    }
}
