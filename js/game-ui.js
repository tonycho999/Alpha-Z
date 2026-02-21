import { state, ALPHABET } from "./game-data.js";
// 만약 다른 모듈이 필요하다면 여기에 추가

// 1. 그리드 렌더링 (export 필수!)
export function renderGrid() {
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    // CSS Grid 스타일 동적 적용
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gap = '2px'; // 셀 간격

    state.grid.forEach((char, idx) => {
        const cell = document.createElement('div');
        cell.id = `cell-${idx}`;
        cell.className = 'cell';
        
        // 망치 모드일 때 커서 스타일 변경
        if(state.isHammerMode) cell.classList.add('hammer-target');

        if (char) {
            cell.classList.add(`b-${char}`); // 예: b-A, b-B
            cell.textContent = char;
            
            // 특수 블록 스타일 등 추가 가능
        } else {
            cell.classList.add('empty');
        }
        
        // 클릭 이벤트 연결 (망치 모드 등)
        // 순환 참조 방지를 위해 window.gameLogic.handleCellClick 처럼 전역 함수를 쓰거나,
        // game-flow.js를 import해서 써야 하는데, 일단 onclick 속성으로 처리하거나 
        // 여기서 직접 addEventListener를 붙일 수 있습니다.
        cell.onclick = () => {
             // game-flow.js의 handleCellClick을 전역으로 노출시켜두면 편리합니다.
             if(window.gameLogic && window.gameLogic.handleCellClick) {
                 window.gameLogic.handleCellClick(idx);
             }
        };

        gridEl.appendChild(cell);
    });
}

// 2. 핸드(대기열) 렌더링 (export 필수!)
export function renderHand() {
    const handContainer = document.getElementById('hand-container'); // ID 확인 필요
    // 만약 HTML에 hand-0, hand-1, hand-2가 직접 있다면 그 요소들을 갱신
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if (!slot) continue;
        
        slot.innerHTML = ''; // 초기화
        slot.style.opacity = '1'; // 드래그 후 복구
        
        const block = state.hand[i];
        if (block) {
            // 미니 그리드 생성
            const miniGrid = document.createElement('div');
            miniGrid.className = 'mini-grid';
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = `repeat(${block.shape.w}, 1fr)`;
            miniGrid.style.gridTemplateRows = `repeat(${block.shape.h}, 1fr)`;
            miniGrid.style.gap = '1px';
            
            // 슬롯 크기에 맞춰 스케일 조정이 필요할 수 있음
            
            block.items.forEach((char, idx) => {
                const cell = document.createElement('div');
                cell.className = `cell small b-${char}`;
                cell.textContent = char;
                
                // 모양(shape.map)에 따라 위치 잡기
                // CSS Grid를 쓰면 자동으로 배치되지만, 빈 공간(0,0 이 아닌 곳) 처리가 필요할 수 있음
                // 여기서는 간단히 순서대로 넣는 방식이 아니라 좌표 기반으로 넣어야 정확함
                // 하지만 미리보기용으로는 flex나 단순 grid로도 충분할 수 있음.
                // 정확한 모양 유지를 위해 shape.map 사용 권장
                
                // (간소화) 일단 그냥 추가 (모양 찌그러질 수 있음, 개선 필요 시 요청주세요)
                cell.style.gridColumnStart = block.shape.map[idx][1] + 1;
                cell.style.gridRowStart = block.shape.map[idx][0] + 1;
                
                miniGrid.appendChild(cell);
            });
            
            slot.appendChild(miniGrid);
            
            // 드래그 이벤트 연결 (game-ui.js 내부에 setupDrag 함수가 있다면 호출)
            if(setupDragForSlot) setupDragForSlot(slot, i);
        }
    }
}

// 3. UI 텍스트 업데이트 (점수, 베스트 등)
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

// 4. 게임 오버 UI 갱신
export function updateGameOverUI() {
    // 팝업 내용 갱신 등
    const overBest = document.getElementById('over-best');
    if(overBest) overBest.textContent = state.best;
}

// 5. 실제 셀 크기 계산 (드래그 좌표용)
export function getActualCellSize() {
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return 0;
    // 첫 번째 셀을 찾아 크기 측정
    const cell = gridEl.querySelector('.cell');
    if (cell) return cell.offsetWidth;
    
    // 셀이 아직 없으면 계산 (전체 너비 / 칸수)
    return (gridEl.offsetWidth - (state.gridSize - 1) * 2) / state.gridSize; // gap 2px 고려
}

// 6. 드래그 셋업 함수 (game-main.js에서 호출하거나 renderHand에서 내부 호출)
// 콜백(onDrop)을 인자로 받아서 순환 참조 회피
export function setupDrag(onDropCallback) {
    // 이 함수는 외부(game-flow.js)에서 호출하여 handleDropAttempt를 넘겨줍니다.
    // 내부 구현은 기존 setupDrag 로직을 사용하되, 전역 변수 대신 인자를 활용
    window._onDropCallback = onDropCallback; // 임시 저장
}

// 개별 슬롯에 드래그 이벤트 붙이기 (내부 함수)
function setupDragForSlot(slot, index) {
    // ... (기존 드래그 로직 복사/수정) ...
    // onDrop 시 window._onDropCallback(targetIdx, isPreview) 호출
    
    const ghost = document.getElementById('ghost');
    
    const start = (e) => {
        if(state.isLocked) return;
        state.dragIndex = index;
        const cellSize = getActualCellSize();
        const block = state.hand[index];
        if(!block) return;

        // 고스트 설정
        ghost.innerHTML = '';
        ghost.style.display = 'grid';
        ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
        ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
        ghost.style.gap = '2px';
        
        block.items.forEach((char, idx) => {
            const b = document.createElement('div');
            b.className = `cell b-${char}`;
            b.textContent = char;
            b.style.fontSize = (cellSize * 0.5) + 'px';
            b.style.gridColumnStart = block.shape.map[idx][1] + 1;
            b.style.gridRowStart = block.shape.map[idx][0] + 1;
            ghost.appendChild(b);
        });
        
        slot.style.opacity = '0';
        
        const getPos = (ev) => {
            const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
            return { x: t.clientX, y: t.clientY };
        };

        const moveHandler = (me) => {
            if(me.cancelable) me.preventDefault();
            const p = getPos(me);
            
            // 고스트 이동
            ghost.style.left = (p.x - ghost.offsetWidth/2) + 'px';
            ghost.style.top = (p.y - ghost.offsetHeight - 50) + 'px'; // 손가락 위로

            // 자석 감지 및 미리보기
            const idx = getMagnetGridIndex(p.x, p.y - 100); // Y 오프셋 고려
            
            // 미리보기 하이라이트 초기화
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            
            if (idx !== -1 && window._onDropCallback) {
                 window._onDropCallback(idx, true); // isPreview = true
            }
        };

        const endHandler = (ee) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);

            const p = getPos(ee);
            const idx = getMagnetGridIndex(p.x, p.y - 100);
            
            let success = false;
            if (idx !== -1 && window._onDropCallback) {
                success = window._onDropCallback(idx, false); // isPreview = false (실제 드롭)
            }
            
            ghost.style.display = 'none';
            if (!success) {
                slot.style.opacity = '1';
                state.dragIndex = -1;
            }
            // 하이라이트 제거
            document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
            document.querySelectorAll('.merging-source').forEach(el => el.classList.remove('merging-source'));
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchend', endHandler);
    };

    slot.onmousedown = start;
    slot.ontouchstart = start;
}

// 자석 인덱스 계산 (export 필요하면 추가)
export function getMagnetGridIndex(x, y) {
    // ... (기존 로직: 중심점 거리 계산 등) ...
    // 좌표가 유효하면 인덱스 반환, 아니면 -1
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const cellSize = getActualCellSize();
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;
    
    const c = Math.floor((x - rect.left) / cellSize);
    const r = Math.floor((y - rect.top) / cellSize);
    
    if(c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}
