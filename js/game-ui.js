import { state } from "./game-data.js";

export function renderGrid() {
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gap = '3px';
    state.grid.forEach((char, idx) => {
        const cell = document.createElement('div');
        cell.id = `cell-${idx}`;
        cell.className = 'cell';
        if(state.isHammerMode) cell.classList.add('hammer-target');
        if (char) { cell.classList.add(`b-${char}`); cell.textContent = char; } 
        else { cell.classList.add('empty'); }
        cell.onclick = () => {
             if(window.gameLogic && window.gameLogic.handleCellClick) window.gameLogic.handleCellClick(idx);
        };
        gridEl.appendChild(cell);
    });
}

export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        slot.innerHTML = '';
        slot.style.opacity = '1';
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            miniGrid.style.pointerEvents = 'none'; // 터치 통과 필수
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            miniGrid.style.justifySelf = 'center'; miniGrid.style.alignSelf = 'center';
            block.items.forEach((char, idx) => {
                const cell = document.createElement('div');
                cell.className = `cell b-${char}`;
                cell.textContent = char;
                cell.style.fontSize = '1.2rem';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center'; cell.style.alignItems = 'center';
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                miniGrid.appendChild(cell);
            });
            slot.appendChild(miniGrid);
            setupDragForSlot(slot, i);
        }
    }
}

// [UI 업데이트] 점수 및 아이템 개수
export function updateUI() {
    if(document.getElementById('ui-best')) document.getElementById('ui-best').textContent = state.best;
    if(document.getElementById('ui-stars')) document.getElementById('ui-stars').textContent = state.stars;
    if(document.getElementById('ui-diff')) document.getElementById('ui-diff').textContent = state.diff;
    if(document.getElementById('ui-score')) document.getElementById('ui-score').textContent = state.score;

    if (state.items) {
        if(document.getElementById('cnt-refresh')) document.getElementById('cnt-refresh').textContent = state.items.refresh;
        if(document.getElementById('cnt-hammer')) document.getElementById('cnt-hammer').textContent = state.items.hammer;
        if(document.getElementById('cnt-upgrade')) document.getElementById('cnt-upgrade').textContent = state.items.upgrade;
    }
}

export function updateGameOverUI() {
    document.getElementById('over-best').textContent = state.best;
}

export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
}

// [드래그 로직]
function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    // 현재 실제 셀 크기 측정 (오차 방지)
    const getRealCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        if (!gridEl) return 40;
        const cell = gridEl.querySelector('.cell');
        // 셀이 있으면 그 크기, 없으면 계산
        if (cell) return cell.offsetWidth;
        const gap = 3; 
        return (gridEl.offsetWidth - (state.gridSize - 1) * gap) / state.gridSize;
    };

    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getRealCellSize();
        const block = state.hand[index];
        if(!block) return;

        // 오프셋: 셀 크기의 1.8배만큼 위로 (손가락에 안 가리게)
        const yOffset = cellSize * 1.8; 

        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '3px';
        ghost.style.pointerEvents = 'none';
        
        block.items.forEach((char, idx) => {
            const b = document.createElement('div');
            b.className = `cell b-${char}`; b.textContent = char;
            b.style.fontSize = (cellSize*0.55)+'px';
            b.style.gridColumnStart = block.shape.map[idx][1] + 1;
            b.style.gridRowStart = block.shape.map[idx][0] + 1;
            ghost.appendChild(b);
        });
        
        slot.style.opacity = '0';
        
        const getPos = (ev) => { return { x: (ev.changedTouches?ev.changedTouches[0]:ev).clientX, y: (ev.changedTouches?ev.changedTouches[0]:ev).clientY }; };
        const updateGhost = (x,y) => { 
            ghost.style.left = (x - ghost.offsetWidth/2)+'px'; 
            ghost.style.top = (y - ghost.offsetHeight - yOffset)+'px'; 
        };
        
        const init = getPos(e); ghost.style.display='grid'; updateGhost(init.x, init.y);
        
        const move = (me) => { 
            if(me.cancelable) me.preventDefault(); 
            const p = getPos(me); updateGhost(p.x, p.y); 
            
            // [중요] Ghost 중심점 기준 인덱스 찾기
            const rect = ghost.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const idx = getMagnetIndex(cx, cy);
            
            document.querySelectorAll('.highlight-valid').forEach(el=>el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el=>el.classList.remove('will-merge'));
            
            // [하이라이트 유지] 기존 콜백 호출
            if(idx!==-1 && window._onDropCallback) window._onDropCallback(idx, true);
        };
        
        const end = (ee) => {
            window.removeEventListener('mousemove', move); window.removeEventListener('touchmove', move);
            window.removeEventListener('mouseup', end); window.removeEventListener('touchend', end);
            
            const rect = ghost.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const idx = getMagnetIndex(cx, cy);

            let success = false;
            if(idx!==-1 && window._onDropCallback) success = window._onDropCallback(idx, false);
            
            ghost.style.display='none';
            if(!success) { slot.style.opacity='1'; state.dragIndex=-1; }
            document.querySelectorAll('.highlight-valid').forEach(el=>el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el=>el.classList.remove('will-merge'));
        };
        
        window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('mouseup', end); window.addEventListener('touchend', end);
    };
    slot.onmousedown = start; slot.ontouchstart = start;
}

// [자석 로직 수정] 보드 실제 크기 기반 계산 (오차 제거)
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const gap = 3;
    const padding = 5; 
    
    // 현재 셀 크기 역산
    const cellSize = (rect.width - (state.gridSize - 1) * gap - (padding * 2)) / state.gridSize;
    
    // 범위 체크
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding;
    
    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) return r * state.gridSize + c;
    return -1;
}
