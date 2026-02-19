import { state } from "./game-data.js";

function getActualCellSize() {
    const sample = document.querySelector('.grid-container .cell');
    return sample ? sample.getBoundingClientRect().width : 40;
}

export function renderGrid() {
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        const char = state.grid[i];
        cell.className = 'cell'; cell.textContent = ''; cell.style.transform = ''; cell.style.opacity = '1';
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
    const size = elementId === 'next-preview' ? 30 : getActualCellSize();
    el.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
    
    block.items.forEach((char, i) => {
        const b = document.createElement('div');
        b.className = `cell b-${char}`;
        b.style.fontSize = elementId === 'next-preview' ? '0.9rem' : '1.3rem';
        b.textContent = char;
        b.style.gridColumnStart = block.shape.map[i][1] + 1;
        b.style.gridRowStart = block.shape.map[i][0] + 1;
        el.appendChild(b);
    });
}

export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    let isDragging = false;

    const start = (e) => {
        if(state.isLocked || state.isHammerMode) return;
        e.preventDefault(); isDragging = true;
        ghost.innerHTML = source.innerHTML; ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        moveGhost(e); source.style.opacity = '0';
    };

    const move = (e) => {
        if(!isDragging) return;
        moveGhost(e);
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        const idx = getMathGridIndex(e); // 오프셋 좌표 반영된 함수 호출
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if(!isDragging) return;
        isDragging = false; ghost.style.display = 'none'; source.style.opacity = '1';
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        const idx = getMathGridIndex(e);
        if(idx !== -1) onDrop(idx, false);
    };

    source.ontouchstart = source.onmousedown = start;
    window.ontouchmove = window.onmousemove = move;
    window.ontouchend = window.onmouseup = end;
}

function moveGhost(e) {
    const ptr = e.touches ? e.touches[0] : e;
    const ghost = document.getElementById('ghost');
    ghost.style.left = ptr.clientX + 'px';
    ghost.style.top = ptr.clientY + 'px';
}

function getMathGridIndex(e) {
    const ptr = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    const grid = document.getElementById('grid-container');
    if(!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const x = ptr.clientX - rect.left;
    // 손가락 위치에서 60px 위 지점을 기준으로 보드 좌표 계산
    const y = (ptr.clientY - 60) - rect.top;

    if (x < -20 || y < -20 || x > rect.width + 20 || y > rect.height + 20) return -1;

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
