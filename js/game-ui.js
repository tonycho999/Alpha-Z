import { state, ALPHABET } from "./game-data.js";

// 1. 그리드 그리기
export function renderGrid() {
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gap = '3px'; // 스타일 CSS와 동일하게 맞춤

    state.grid.forEach((char, idx) => {
        const cell = document.createElement('div');
        cell.id = `cell-${idx}`;
        cell.className = 'cell';
        
        if(state.isHammerMode) cell.classList.add('hammer-target');

        if (char) {
            cell.classList.add(`b-${char}`);
            cell.textContent = char;
        } else {
            cell.classList.add('empty');
        }
        
        cell.onclick = () => {
             if(window.gameLogic && window.gameLogic.handleCellClick) {
                 window.gameLogic.handleCellClick(idx);
             }
        };
        gridEl.appendChild(cell);
    });
}

// 2. 핸드(대기열) 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        
        slot.innerHTML = '';
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            const miniGrid = document.createElement('div');
            // 터치 이벤트 통과 (슬롯이 클릭되게)
            miniGrid.style.pointerEvents = 'none';
            
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '2px';
            
            // 핸드에 있을 때는 잘 보이게 고정 크기 사용
            miniGrid.style.width = (block.shape.w * 35) + 'px'; 
            miniGrid.style.height = (block.shape.h * 35) + 'px';
            miniGrid.style.justifySelf = 'center';
            miniGrid.style.alignSelf = 'center';

            block.items.forEach((char, idx) => {
                const cell = document.createElement('div');
                cell.className = `cell b-${char}`;
                cell.textContent = char;
                cell.style.fontSize = '1.2rem';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                
                miniGrid.appendChild(cell);
            });
            slot.appendChild(miniGrid);
            
            // 내부 함수 직접 호출
            setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 업데이트
export function updateUI() {
    const bestEl = document.getElementById('ui-best');
    if(bestEl) bestEl.textContent = state.best;
    
    const starEl = document.getElementById('ui-stars');
    if(starEl) starEl.textContent = state.stars;

    const diffEl = document.getElementById('ui-diff');
    if(diffEl) diffEl.textContent = state.diff;

    const scoreEl = document.getElementById('ui-score');
    if(scoreEl) scoreEl.textContent = state.score;
}

export function updateGameOverUI() {
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

export function setupDrag(onDropCallback) {
    window._onDropCallback = onDropCallback;
}

// [핵심] 드래그 로직 (동적 좌표 계산 적용)
function setupDragForSlot(slot, index) {
    const ghost = document.getElementById('ghost');
    
    // 현재 보드판의 실제 셀 크기를 가져오는 함수
    const getRealCellSize = () => {
        const gridEl = document.getElementById('grid-container');
        const cell = gridEl.querySelector('.cell');
        // 셀이 생성되어 있다면 셀의 실제 크기, 없다면 계산된 크기 반환
        if (cell) return cell.offsetWidth;
        return (gridEl.offsetWidth - (state.gridSize - 1) * 3) / state.gridSize;
    };

    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        
        // [중요] 드래그 시작 시점의 셀 크기 측정
        const cellSize = getRealCellSize();
        const block = state.hand[index];
        if(!block) return;

        // [중요] 오프셋 설정: 셀 크기의 1.8배만큼 손가락 위로 띄움
        // 고정값(80px) 대신 비율을 사용하여 모든 해상도/그리드 대응
        const yOffset = cellSize * 1.8; 

        // Ghost 모양 잡기 (실제 보드 셀 크기와 동일하게)
        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '3px';
        ghost.style.pointerEvents = 'none'; 
        
        block.items.forEach((char, idx) => {
            const b = document.createElement('div');
            b.className = `cell b-${char}`;
            b.textContent = char;
            // 폰트 크기도 셀 크기에 비례해서 조정
            b.style.fontSize = (cellSize * 0.55) + 'px'; 
            b.style.gridColumnStart = block.shape.map[idx][1] + 1;
            b.style.gridRowStart = block.shape.map[idx][0] + 1;
            ghost.appendChild(b);
        });
        
        slot.style.opacity = '0'; 
        
        const getPos = (ev) => {
            const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
            return { x: t.clientX, y: t.clientY };
        };

        // Ghost 위치 업데이트 함수
        const updateGhostPos = (x, y) => {
            const ghostW = ghost.offsetWidth;
            const ghostH = ghost.offsetHeight;
            // 가로: 중앙, 세로: 손가락보다 yOffset 만큼 위로
            ghost.style.left = (x - ghostW / 2) + 'px';
            ghost.style.top = (y - ghostH - yOffset) + 'px'; 
        };

        const initPos = getPos(e);
        ghost.style.display = 'grid';
        updateGhostPos(initPos.x, initPos.y);

        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            updateGhostPos(p.x, p.y);

            // [중요] 판정 기준: Ghost의 '중심점(Center)' 좌표
            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;

            const idx = getMagnetIndex(centerX, centerY);
            
            // 초기화
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));
            
            if (idx !== -1 && window._onDropCallback) {
                 window._onDropCallback(idx, true); // 미리보기
            }
        };

        const endHandler = (ee) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);

            const ghostRect = ghost.getBoundingClientRect();
            const centerX = ghostRect.left + ghostRect.width / 2;
            const centerY = ghostRect.top + ghostRect.height / 2;
            const idx = getMagnetIndex(centerX, centerY);
            
            let success = false;
            if (idx !== -1 && window._onDropCallback) {
                success = window._onDropCallback(idx, false);
            }
            
            ghost.style.display = 'none';
            if (!success) {
                slot.style.opacity = '1';
                state.dragIndex = -1;
            }
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchend', endHandler);
    };

    slot.onmousedown = start;
    slot.ontouchstart = start;
}

// [중요] 자석 인덱스 계산 (좌표 오차 원인 제거)
function getMagnetIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    
    // gap(3px)을 고려한 정확한 셀 크기 계산
    // 공식: (전체너비 - (칸수-1)*갭) / 칸수
    const gap = 3;
    const cellSize = (rect.width - (state.gridSize - 1) * gap) / state.gridSize; 
    
    // 보드 범위 체크 (여유 10px)
    if (x < rect.left - 10 || x > rect.right + 10 || y < rect.top - 10 || y > rect.bottom + 10) return -1;
    
    // 내부 좌표 (패딩이 있다면 패딩도 빼줘야 함, 현재 CSS엔 패딩 5px 있음)
    const padding = 5;
    const lx = x - rect.left - padding;
    const ly = y - rect.top - padding;

    // gap을 포함하여 인덱스 계산
    // 셀 1개의 차지 공간 = cellSize + gap (마지막 칸 제외)
    // 단순히 나누면 gap 때문에 뒤로 갈수록 오차가 쌓이므로 보정
    const c = Math.floor(lx / (cellSize + gap));
    const r = Math.floor(ly / (cellSize + gap));
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
