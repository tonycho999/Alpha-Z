import { state } from "./game-data.js";

// ==========================================
// [기존 UI 로직 - 수정 없음]
// ==========================================

// 정확한 셀 크기 계산
export function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 40;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const actualWidth = rect.width - paddingX;
    return actualWidth / state.gridSize;
}

// 그리드 그리기
export function renderGrid() { 
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;
    if (gridEl.children.length !== state.gridSize * state.gridSize) {
        gridEl.innerHTML = '';
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            const div = document.createElement('div');
            div.className = 'cell'; 
            div.id = `cell-${i}`;
            gridEl.appendChild(div);
        }
    }
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;
        const hasHighlight = cell.classList.contains('highlight-valid');
        cell.className = 'cell'; 
        if (hasHighlight) cell.classList.add('highlight-valid');
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';
        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
            cell.classList.add('pop-effect');
        }
    }
}

// 핸드 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        slot.innerHTML = ''; 
        slot.style.opacity = '1';
        const block = state.hand[i];
        if (block) {
            const size = 25; 
            const gridDiv = document.createElement('div');
            gridDiv.style.display = 'grid';
            gridDiv.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
            gridDiv.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
            gridDiv.style.gap = '2px';
            gridDiv.style.pointerEvents = 'none';
            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '0.9rem';
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                gridDiv.appendChild(b);
            });
            slot.appendChild(gridDiv);
        }
    }
}

// 드래그 설정
const DRAG_Y_OFFSET = 90;
export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        slot.onmousedown = null;
        slot.ontouchstart = null;
        if (!state.hand[i]) continue; 
        const start = (e) => {
            if(state.isLocked) return;
            state.dragIndex = i; 
            const cellSize = getActualCellSize();
            const block = state.hand[i];
            ghost.innerHTML = '';
            ghost.style.position = 'fixed'; 
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
            ghost.style.gap = '3px';
            ghost.style.zIndex = '9999';
            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '1.5rem';
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                ghost.appendChild(b);
            });
            slot.style.opacity = '0'; 
            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            const pos = getPos(e);
            moveGhost(pos.x, pos.y);
            function moveGhost(x, y) {
                const w = ghost.offsetWidth;
                const h = ghost.offsetHeight;
                ghost.style.left = (x - w/2) + 'px';
                ghost.style.top = (y - h/2 - DRAG_Y_OFFSET) + 'px'; 
                const idx = getMagnetGridIndex(x, y - DRAG_Y_OFFSET);
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                if (idx !== -1) { onDrop(idx, true); }
            }
            const moveHandler = (me) => {
                if(me.cancelable) me.preventDefault();
                const p = getPos(me);
                moveGhost(p.x, p.y);
            };
            const endHandler = (ee) => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchend', endHandler);
                const p = getPos(ee);
                const idx = getMagnetGridIndex(p.x, p.y - DRAG_Y_OFFSET);
                let success = false;
                if (idx !== -1) { success = onDrop(idx, false); }
                ghost.style.display = 'none';
                if (!success) { slot.style.opacity = '1'; }
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
            };
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler, { passive: false });
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchend', endHandler);
        };
        slot.onmousedown = start;
        slot.ontouchstart = start;
    }
}

// 자석 좌표 계산
export function getMagnetGridIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    if (x < rect.left - 50 || x > rect.right + 50 || y < rect.top - 50 || y > rect.bottom + 50) {
        return -1;
    }
    const cellSize = getActualCellSize();
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    let relX = x - rect.left - paddingLeft;
    let relY = y - rect.top - paddingTop;
    const maxPos = cellSize * state.gridSize - 1; 
    relX = Math.max(0, Math.min(relX, maxPos));
    relY = Math.max(0, Math.min(relY, maxPos));
    const c = Math.floor(relX / cellSize);
    const r = Math.floor(relY / cellSize);
    if (r >= 0 && r < state.gridSize && c >= 0 && c < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}

// ==========================================
// [UI 업데이트 로직 - 여기만 수정/추가됨]
// ==========================================

export function updateUI() {
    // 1. 별 개수 업데이트
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;

    // 2. 현재 게임의 최고 알파벳 표시
    const bestEl = document.getElementById('game-best-char');
    if(bestEl) bestEl.textContent = state.best;

    // 3. [추가] 팝업이 떠있으면 게임 오버 UI도 갱신
    const popup = document.getElementById('popup-over');
    if (popup && popup.style.display !== 'none') {
        updateGameOverUI();
    }
}

// [신규 기능] 게임 오버 UI (기기에 저장된 ID 확인 및 점수 비교)
export function updateGameOverUI() {
    const savedName = localStorage.getItem('alpha_username');
    const localBestChar = localStorage.getItem('alpha_best_char') || 'A';
    
    // 알파벳 비교를 위해 인덱스 계산 (A=0, B=1...)
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const currentIdx = ALPHABET.indexOf(state.best);
    const localIdx = ALPHABET.indexOf(localBestChar);

    // UI 요소 가져오기
    const areaNew = document.getElementById('area-new-user');
    const areaExist = document.getElementById('area-exist-user');
    const msgSave = document.getElementById('save-msg');
    const msgLow = document.getElementById('low-score-msg');
    const errBox = document.getElementById('save-error');
    
    // 초기화: 일단 모두 숨김
    if(areaNew) areaNew.style.display = 'none';
    if(areaExist) areaExist.style.display = 'none';
    if(msgSave) msgSave.style.display = 'none';
    if(msgLow) msgLow.style.display = 'none';
    if(errBox) errBox.style.display = 'none';

    // 1. 이미 저장 완료된 상태면 성공 메시지만 표시
    if (state.isSaved) {
        if(msgSave) msgSave.style.display = 'block';
        return;
    }

    // 2. 신규 유저 (기기에 ID 없음) -> 이름 입력창 노출
    if (!savedName) {
        if(areaNew) areaNew.style.display = 'block';
    } 
    // 3. 기존 유저 (기기에 ID 있음)
    else {
        const badge = document.getElementById('user-badge');
        if(badge) badge.textContent = savedName; // ID 표시

        // ★ 핵심: 이번 판 점수(currentIdx)가 내 최고 기록(localIdx)보다 클 때만 버튼 노출
        if (currentIdx > localIdx) {
            if(areaExist) areaExist.style.display = 'block'; // "Update Best Score" 버튼
        } else {
            if(msgLow) msgLow.style.display = 'block'; // "No new record" 메시지
        }
    }
}
