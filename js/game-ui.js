import { state } from "./game-data.js";

// 1. 그리드
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

// 2. 핸드 (터치 통과 중요)
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        slot.innerHTML = '';
        slot.style.opacity = '1';
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            miniGrid.style.pointerEvents = 'none'; // [중요] 슬롯 클릭 허용
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
            // 드래그 연결
            setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 업데이트 (아이템 개수 표시 필수)
export function updateUI() {
    if(document.getElementById('ui-best')) document.getElementById('ui-best').textContent = state.best;
    if(document.getElementById('ui-stars')) document.getElementById('ui-stars').textContent = state.stars;
    if(document.getElementById('ui-diff')) document.getElementById('ui-diff').textContent = state.diff;
    if(document.getElementById('ui-score')) document.getElementById('ui-score').textContent = state.score;

    // 아이템 개수 업데이트 (ID 확인)
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

// [핵심] 드래그 로직 (자석 오차 해결)
function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    // 현재 보드판의 실제 셀 크기 계산
    const getRealCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        if(!gridEl) return 40;
        const cell = gridEl.querySelector('.cell');
        if(cell) return cell.offsetWidth;
        const rect = gridEl.getBoundingClientRect();
        return (rect.width - (state.gridSize - 1) * 3) / state.gridSize; // 계산식
    };

    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getRealCellSize();
        const block = state.hand[index];
        if(!block) return;

        // [오차 해결] 손가락보다 1.8배 위로 띄움
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
        
        const getPos = (ev) => { 
            const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
            return { x: t.clientX, y: t.clientY }; 
        };
        
        const updateGhost = (x,y) => { 
            ghost.style.left = (x - ghost.offsetWidth/2)+'px'; 
            ghost.style.top = (y - ghost.offsetHeight - yOffset)+'px'; 
        };
        
        const init = getPos(e); ghost.style.display='grid'; updateGhost(init.x, init.y);
        
        const move = (me) => { 
            if(me.cancelable) me.preventDefault(); 
            const p = getPos(me); updateGhost(p.x, p.y); 
            
            // [자석 판정] Ghost의 중심점(Center)을 기준으로 판정
            const rect = ghost.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const idx = getMagnetIndex(cx, cy);
            
            document.querySelectorAll('.highlight-valid').forEach(el=>el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el=>el.classList.remove('will-merge'));
            
            // [기존 기능 유지] 하이라이트/Merge 미리보기 실행
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

// [자석 계산식] 실제 렌더링된 크기 기준 (오차 없음)
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const gap = 3;
    const padding = 5; 
    
    // 실제 렌더링된 셀 크기 역산 (중요)
    const cellSize = (rect.width - (state.gridSize - 1) * gap - (padding * 2)) / state.gridSize;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding;
    
    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) return r * state.gridSize + c;
    return -1;
}
