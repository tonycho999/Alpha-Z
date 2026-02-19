import { state } from "./game-data.js";

// 동적으로 현재 화면에 렌더링된 셀의 사이즈를 가져옴
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
    
    // Grid 셀 크기와 똑같이 맞춰서 드래그 위화감 없앰
    const size = elementId === 'next-preview' ? 30 : getActualCellSize();
    el.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
    
    block.items.forEach((char, i) => {
        const b = document.createElement('div');
        b.className = `cell b-${char}`;
        b.style.fontSize = elementId === 'next-preview' ? '0.9rem' : '1.2rem';
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
        
        // 고스트 크기 동기화
        ghost.innerHTML = source.innerHTML; 
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        
        moveGhost(e); source.style.opacity = '0';
    };

    const move = (e) => {
        if(!isDragging) return;
        moveGhost(e);
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        const idx = getExactHoveredCell(e);
        if(idx !== -1) onDrop(idx, true);
    };

    const end = (e) => {
        if(!isDragging) return;
        isDragging = false; ghost.style.display = 'none'; source.style.opacity = '1';
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        const idx = getExactHoveredCell(e);
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

// 가장 완벽한 타겟팅 방식: 마우스 포인터 밑에 있는 요소를 직접 찾음
function getExactHoveredCell(e) {
    const ptr = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    const elements = document.elementsFromPoint(ptr.clientX, ptr.clientY);
    for (let el of elements) {
        if (el.classList.contains('cell') && el.parentElement.id === 'grid-container') {
            return parseInt(el.id.replace('cell-', ''));
        }
    }
    return -1;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
