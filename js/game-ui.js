import { state } from "./game-data.js";

// 그리드 그리기
export function renderGrid() {
    for(let i=0; i<25; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        const char = state.grid[i];
        cell.className = 'cell';
        cell.textContent = '';
        cell.style.transform = ''; cell.style.opacity = '1';
        if(char) {
            cell.textContent = char;
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
            cell.classList.add('pop-effect');
        }
    }
}

// 소스 블록 그리기
export function renderSource(block, elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    el.innerHTML = '';
    const size = elementId === 'next-preview' ? '40px' : 'var(--cell-size)';
    el.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size})`;
    el.style.gridTemplateRows = `repeat(${block.shape.h}, ${size})`;
    
    block.items.forEach((char, i) => {
        const b = document.createElement('div');
        b.className = `cell b-${char}`;
        if(elementId === 'next-preview') { b.style.width=size; b.style.height=size; }
        b.textContent = char;
        b.style.gridColumnStart = block.shape.map[i][1] + 1;
        b.style.gridRowStart = block.shape.map[i][0] + 1;
        el.appendChild(b);
    });
}

// 드래그 앤 드롭 설정
export function setupDrag(onDrop) {
    const source = document.getElementById('source-block');
    const ghost = document.getElementById('ghost');
    if(!source) return;

    let isDragging = false;

    const start = (e) => {
        if(state.isLocked) return;
        e.preventDefault();
        isDragging = true;
        ghost.innerHTML = source.innerHTML;
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
        ghost.style.gridTemplateRows = source.style.gridTemplateRows;
        moveGhost(e);
        source.style.opacity = '0';
    };

    const move = (e) => {
        if(!isDragging) return;
        moveGhost(e);
        const idx = getClosestIndex(e);
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        if(idx !== -1 && onDrop(idx, true)) { /* 미리보기 로직 */ } 
    };

    const end = (e) => {
        if(!isDragging) return;
        isDragging = false;
        ghost.style.display = 'none';
        source.style.opacity = '1';
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        
        const idx = getClosestIndex(e);
        if(idx !== -1) onDrop(idx, false); // 실제 드롭
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

function getClosestIndex(e) {
    const ptr = e.changedTouches ? e.changedTouches[0] : e;
    let minDist = 9999, targetIdx = -1;
    for(let i=0; i<25; i++) {
        const cell = document.getElementById(`cell-${i}`);
        const rect = cell.getBoundingClientRect();
        const dist = Math.hypot((rect.left+rect.width/2) - ptr.clientX, (rect.top+rect.height/2) - ptr.clientY);
        if(dist < 50 && dist < minDist) { minDist = dist; targetIdx = i; }
    }
    return targetIdx;
}

export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    document.getElementById('ui-best').textContent = state.best;
}
