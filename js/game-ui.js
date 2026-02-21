import { state, ALPHABET } from "./game-data.js";

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
            miniGrid.style.pointerEvents = 'none'; // 터치 통과
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

// [핵심 수정] UI 업데이트 (현재 보드 최고 블록 표시)
export function updateUI() {
    // 1. 현재 보드에서 가장 높은 알파벳 찾기
    let currentMaxChar = 'A';
    let maxIdx = 0;

    if (state.grid && state.grid.length > 0) {
        state.grid.forEach(char => {
            if (char) {
                const idx = ALPHABET.indexOf(char);
                if (idx > maxIdx) {
                    maxIdx = idx;
                    currentMaxChar = char;
                }
            }
        });
    }

    // 2. UI 반영
    if(document.getElementById('ui-best')) document.getElementById('ui-best').textContent = currentMaxChar;
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
    // 게임 오버 시에는 '역사상 최고 기록'을 보여줄지, '이번 판 최고 기록'을 보여줄지 결정해야 하는데
    // 보통 게임 오버 팝업은 state.best(역사적 최고)를 보여주는 것이 일반적입니다.
    // 만약 이것도 이번 판 기록으로 바꾸고 싶으시면 위 로직을 그대로 쓰시면 됩니다.
    document.getElementById('over-best').textContent = state.best;
}

export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
}

function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    // [자석 오차 해결] 실제 셀 크기 측정
    const getRealCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        if(!gridEl) return 40;
        const cell = gridEl.querySelector('.cell');
        if(cell) return cell.offsetWidth;
        const rect = gridEl.getBoundingClientRect();
        return (rect.width - (state.gridSize - 1) * 3) / state.gridSize;
    };

    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getRealCellSize();
        const block = state.hand[index];
        if(!block) return;

        // [오차 해결] 손가락 위로 띄움
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
            
            // [자석] Ghost의 '첫 번째 칸(Top-Left)' 중앙 기준
            const rect = ghost.getBoundingClientRect();
            const cx = rect.left + (cellSize / 2);
            const cy = rect.top + (cellSize / 2);
            const idx = getMagnetIndex(cx, cy);
            
            document.querySelectorAll('.highlight-valid').forEach(el=>el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el=>el.classList.remove('will-merge'));
            
            if(idx!==-1 && window._onDropCallback) window._onDropCallback(idx, true);
        };
        
        const end = (ee) => {
            window.removeEventListener('mousemove', move); window.removeEventListener('touchmove', move);
            window.removeEventListener('mouseup', end); window.removeEventListener('touchend', end);
            
            const rect = ghost.getBoundingClientRect();
            const cx = rect.left + (cellSize / 2);
            const cy = rect.top + (cellSize / 2);
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

// [자석 계산식]
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const gap = 3;
    const padding = 5; 
    const cellSize = (rect.width - (state.gridSize - 1) * gap - (padding * 2)) / state.gridSize;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding;
    
    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) return r * state.gridSize + c;
    return -1;
}
