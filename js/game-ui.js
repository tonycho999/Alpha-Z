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
            miniGrid.style.pointerEvents = 'none';
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
            if(window.setupDragForSlot) window.setupDragForSlot(slot, i);
        }
    }
}

// [UI 업데이트] 점수, 아이템 개수 갱신
export function updateUI() {
    const bestEl = document.getElementById('ui-best');
    if(bestEl) bestEl.textContent = state.best;
    
    const starEl = document.getElementById('ui-stars');
    if(starEl) starEl.textContent = state.stars;

    const diffEl = document.getElementById('ui-diff');
    if(diffEl) diffEl.textContent = state.diff;

    const scoreEl = document.getElementById('ui-score');
    if(scoreEl) scoreEl.textContent = state.score;

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
    window.setupDragForSlot = setupDragForSlot; // 전역 등록
}

// 드래그 로직 (기존 4번 제외 요청으로 수정 안 함 - 기존 사용하시던 코드 유지)
// 만약 드래그가 안 된다면 이전에 드린 'game-ui.js'의 setupDragForSlot 함수를 다시 넣으세요.
function setupDragForSlot(slot, index) {
    // (기존 코드 유지)
    // ... setupDragForSlot implementation ...
    // 단, 여기서 좌표 문제 해결을 원치 않으셨으므로 기본 로직만 유지합니다.
    // 만약 이전의 '보정된' 코드를 원하시면 이전 답변의 game-ui.js를 쓰세요.
    // 여기서는 '전체 복붙' 요청에 맞추기 위해 가장 안정적인 버전을 넣어둡니다.
    const ghost = document.getElementById('ghost');
    // ... (중략 - 이전 답변의 setupDragForSlot 코드와 동일하게 넣으시면 됩니다)
    // (지면 관계상 생략하지 않고, 안정적인 버전을 아래에 넣습니다)
    
    const getCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        const cell = gridEl.querySelector('.cell');
        return cell ? cell.offsetWidth : 45;
    };
    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getCellSize();
        const block = state.hand[index];
        if(!block) return;
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
        const updateGhost = (x,y) => { ghost.style.left = (x - ghost.offsetWidth/2)+'px'; ghost.style.top = (y - ghost.offsetHeight - 80)+'px'; };
        const init = getPos(e); ghost.style.display='grid'; updateGhost(init.x, init.y);
        
        const move = (me) => { 
            if(me.cancelable) me.preventDefault(); 
            const p = getPos(me); updateGhost(p.x, p.y); 
            // 자석 로직 (기존 유지)
            const grid = document.getElementById('grid-container');
            const rect = grid.getBoundingClientRect();
            const cs = (rect.width - (state.gridSize-1)*3)/state.gridSize;
            const lx = (p.x - ghost.offsetWidth/2 + ghost.offsetWidth/2) - rect.left; // Ghost Center X
            const ly = (p.y - ghost.offsetHeight - 80 + ghost.offsetHeight/2) - rect.top; // Ghost Center Y
            
            let idx = -1;
            if(lx>0 && lx<rect.width && ly>0 && ly<rect.height) {
                const c = Math.floor(lx/cs); const r = Math.floor(ly/cs);
                if(c>=0 && c<state.gridSize && r>=0 && r<state.gridSize) idx = r*state.gridSize+c;
            }
            
            document.querySelectorAll('.highlight-valid').forEach(el=>el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el=>el.classList.remove('will-merge'));
            if(idx!==-1 && window._onDropCallback) window._onDropCallback(idx, true);
        };
        const end = (ee) => {
            window.removeEventListener('mousemove', move); window.removeEventListener('touchmove', move);
            window.removeEventListener('mouseup', end); window.removeEventListener('touchend', end);
            
            const p = getPos(ee);
            const grid = document.getElementById('grid-container');
            const rect = grid.getBoundingClientRect();
            const cs = (rect.width - (state.gridSize-1)*3)/state.gridSize;
            const lx = p.x - rect.left; // 마우스 위치 기준 (단순화)
            const ly = p.y - 80 - rect.top; // 오프셋 반영
            
            let idx = -1;
            if(lx>0 && lx<rect.width && ly>0 && ly<rect.height) {
                const c = Math.floor(lx/cs); const r = Math.floor(ly/cs);
                if(c>=0 && c<state.gridSize && r>=0 && r<state.gridSize) idx = r*state.gridSize+c;
            }

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
