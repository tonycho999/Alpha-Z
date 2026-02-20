import { state } from "./game-data.js";

// ... (getActualCellSize, renderGrid 함수는 기존 그대로 유지) ...
export function renderGrid() { 
    // ... (기존 코드와 동일) ...
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        
        const hasHighlight = cell.classList.contains('highlight-valid');
        
        cell.className = 'cell'; 
        if (hasHighlight) cell.classList.add('highlight-valid');
        
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';
        cell.style.border = ''; 

        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`);
            if(char==='Z') cell.classList.add('b-Z');
            cell.classList.add('pop-effect');
        }
    }
}

// [수정] 핸드(3개 블록) 렌더링 함수
export function renderHand() {
    const handContainer = document.getElementById('hand-container');
    if (!handContainer) return;

    // 슬롯 0, 1, 2 순회
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        const block = state.hand[i];
        
        slot.innerHTML = ''; // 초기화
        slot.style.opacity = '1'; // 투명도 복구

        if (block) {
            // 블록이 있으면 그림
            // 핸드에 있는 블록은 조금 작게 보여주기 위해 size 조정 (예: 25px)
            // 하지만 드래그 시작하면 원래 크기(getActualCellSize)로 커져야 함 -> setupDrag에서 처리
            const size = 30; // 핸드에서의 미리보기 크기
            
            const gridDiv = document.createElement('div');
            gridDiv.style.display = 'grid';
            gridDiv.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
            gridDiv.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
            gridDiv.style.gap = '1px';
            // 중앙 정렬
            gridDiv.style.margin = '0 auto'; 

            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '1rem';
                b.style.width = size + 'px';
                b.style.height = size + 'px';
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                b.style.boxShadow = "inset 0px -3px 0px rgba(0,0,0,0.2)";
                gridDiv.appendChild(b);
            });
            slot.appendChild(gridDiv);
        }
    }
}


// [수정] 3개 슬롯에 대한 드래그 설정
const VISUAL_OFFSET_Y = 120; 

export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    // 3개 슬롯 각각에 이벤트 리스너 등록
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        // 기존 리스너 제거 (중복 방지)
        slot.onmousedown = slot.ontouchstart = null;

        // 블록이 없으면 드래그 불가
        if (!state.hand[i]) continue;

        const start = (e) => {
            if(state.isLocked || state.isHammerMode) return;
            
            // 현재 드래그 중인 인덱스 저장
            state.dragIndex = i;
            
            // 1. 고스트 생성 (현재 보드 크기에 맞춰 리사이징)
            const currentCellSize = getActualCellSize(); // js/game-ui.js 상단에 있는 함수
            const block = state.hand[i];

            ghost.innerHTML = '';
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${currentCellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${currentCellSize}px)`;
            
            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '1.3rem'; // 드래그 중엔 폰트 키움
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                ghost.appendChild(b);
            });

            // 원본 슬롯 숨김
            slot.style.opacity = '0';

            // 위치 잡기 및 이벤트 연결
            const rect = ghost.getBoundingClientRect();
            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            
            const pos = getPos(e);
            updateGhostAndCheck(pos.x, pos.y, rect.width, rect.height, onDrop, false);

            const moveHandler = (me) => {
                if(me.cancelable) me.preventDefault();
                const p = getPos(me);
                const r = ghost.getBoundingClientRect();
                updateGhostAndCheck(p.x, p.y, r.width, r.height, onDrop, false);
            };

            const endHandler = (ee) => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchend', endHandler);

                const p = getPos(ee);
                const r = ghost.getBoundingClientRect();
                
                // 드롭 시도
                const success = updateGhostAndCheck(p.x, p.y, r.width, r.height, onDrop, true);

                ghost.style.display = 'none';
                
                // 실패했으면 원본 다시 보이기
                if (!success) {
                    slot.style.opacity = '1';
                }
                clearHighlights();
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler, { passive: false });
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchend', endHandler);
        };

        slot.onmousedown = slot.ontouchstart = start;
    }
}

// ... (clearHighlights, updateGhostAndCheck, getMagnetGridIndex, getActualCellSize 등 유지) ...
// 주의: updateGhostAndCheck에서 성공 여부(true/false)를 반환하도록 수정하면 좋습니다.
// 하지만 기존 로직(onDrop 호출)을 그대로 써도 됩니다. 

function clearHighlights() {
    const cells = document.querySelectorAll('.grid-container .cell');
    cells.forEach(c => c.classList.remove('highlight-valid'));
}

function updateGhostAndCheck(fingerX, fingerY, w, h, onDrop, isDropAction) {
    const ghost = document.getElementById('ghost');
    const visualLeft = fingerX - (w / 2);
    const visualTop = fingerY - VISUAL_OFFSET_Y - (h / 2);

    ghost.style.left = visualLeft + 'px';
    ghost.style.top = visualTop + 'px';

    const idx = getMagnetGridIndex(fingerX, fingerY - VISUAL_OFFSET_Y);

    if (!isDropAction) {
        clearHighlights();
    }

    if (idx !== -1) {
        // DropAction이면 결과를 리턴
        if (isDropAction) {
             return onDrop(idx, false); // handleDropAttempt 호출
        } else {
             onDrop(idx, true); // 미리보기(Highlight)만
        }
    }
    return false; // 유효하지 않은 위치
}

// [중요] getActualCellSize 함수가 export 되어 있어야 하거나, 파일 상단에 있어야 합니다.
function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 45;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    return (rect.width - (parseFloat(style.paddingLeft)||0) - (parseFloat(style.paddingRight)||0)) / state.gridSize;
}

// ... (getMagnetGridIndex, updateUI 등 유지) ...
export function updateUI() {
    document.getElementById('ui-stars').textContent = state.stars;
    // document.getElementById('ui-best').textContent = state.best; // 필요 시
}
