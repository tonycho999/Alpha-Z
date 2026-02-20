import { state } from "./game-data.js";

// [핵심] 정확한 셀 크기 계산 (자석 효과의 기준)
// 반응형 화면에서 그리드 셀 하나의 실제 픽셀 크기를 구합니다.
export function getActualCellSize() {
    const grid = document.getElementById('grid-container');
    if (!grid) return 40;
    
    const rect = grid.getBoundingClientRect();
    // 패딩을 뺀 '내부' 너비만 사용해야 좌표 계산이 정확합니다.
    const style = window.getComputedStyle(grid);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    
    // (전체 너비 - 패딩) / 칸 수
    const actualWidth = rect.width - paddingX;
    return actualWidth / state.gridSize;
}

// 그리드(보드판) 그리기
export function renderGrid() { 
    const gridEl = document.getElementById('grid-container');
    if (!gridEl) return;

    // CSS Grid 레이아웃 설정
    gridEl.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

    // 셀(DIV)이 부족하면 생성
    if (gridEl.children.length !== state.gridSize * state.gridSize) {
        gridEl.innerHTML = '';
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            const div = document.createElement('div');
            div.className = 'cell'; 
            div.id = `cell-${i}`;
            gridEl.appendChild(div);
        }
    }

    // 각 셀의 상태(알파벳, 색상) 업데이트
    for(let i=0; i<state.gridSize * state.gridSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;
        
        // 초기화 (기존 클래스 제거)
        const hasHighlight = cell.classList.contains('highlight-valid');
        cell.className = 'cell'; 
        if (hasHighlight) cell.classList.add('highlight-valid'); // 하이라이트는 유지
        
        cell.textContent = ''; 
        cell.style.transform = ''; 
        cell.style.opacity = '1';

        const char = state.grid[i];
        if(char) {
            cell.textContent = char; 
            cell.classList.add(`b-${char}`); // 색상 클래스 (예: b-A, b-B)
            if(char==='Z') cell.classList.add('b-Z');
            cell.classList.add('pop-effect'); // 등장 애니메이션
        }
    }
}

// 하단 3개 핸드(블록 슬롯) 그리기
export function renderHand() {
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        
        slot.innerHTML = ''; 
        slot.style.opacity = '1';
        
        const block = state.hand[i];
        if (block) {
            // 핸드에 있는 블록은 작게 보여줌 (미리보기)
            const size = 25; 
            const gridDiv = document.createElement('div');
            gridDiv.style.display = 'grid';
            gridDiv.style.gridTemplateColumns = `repeat(${block.shape.w}, ${size}px)`;
            gridDiv.style.gridTemplateRows = `repeat(${block.shape.h}, ${size}px)`;
            gridDiv.style.gap = '2px';
            gridDiv.style.pointerEvents = 'none'; // 드래그 방해 금지

            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '0.9rem';
                
                // 블록 모양대로 배치
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                gridDiv.appendChild(b);
            });
            slot.appendChild(gridDiv);
        }
    }
}

// [설정] 드래그 시 블록을 손가락 위로 얼마나 띄울지 (px)
const DRAG_Y_OFFSET = 90;

// 드래그 앤 드롭 로직 설정
export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        
        // 중복 이벤트 방지
        slot.onmousedown = null;
        slot.ontouchstart = null;

        if (!state.hand[i]) continue; 

        const start = (e) => {
            if(state.isLocked) return;
            state.dragIndex = i; 
            
            // 1. 고스트 블록 생성 (실제 크기로)
            const cellSize = getActualCellSize();
            const block = state.hand[i];
            
            ghost.innerHTML = '';
            // [중요] fixed로 설정하여 좌표계 통일 (화면 밀림 방지)
            ghost.style.position = 'fixed'; 
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
            ghost.style.gap = '3px'; // style.css의 gap과 일치
            ghost.style.zIndex = '9999'; // 최상단
            
            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                b.style.fontSize = '1.5rem'; // 커진 폰트
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                ghost.appendChild(b);
            });

            // 원본 슬롯은 투명하게 숨김
            slot.style.opacity = '0'; 

            // 좌표 추출 함수 (마우스/터치 공용)
            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            
            // 2. 드래그 시작 위치 설정
            const pos = getPos(e);
            moveGhost(pos.x, pos.y);

            // 3. 움직임 처리 함수
            function moveGhost(x, y) {
                const w = ghost.offsetWidth;
                const h = ghost.offsetHeight;
                
                // 손가락 중심에 오게 하되, Y축으로 조금 위로 띄움 (내 손에 가리지 않게)
                ghost.style.left = (x - w/2) + 'px';
                ghost.style.top = (y - h/2 - DRAG_Y_OFFSET) + 'px'; 
                
                // [마그네틱 로직] 현재 위치에 해당하는 그리드 인덱스 찾기
                // ghost가 아니라 '손가락 위치'를 기준으로 판단하는 것이 더 직관적임
                const idx = getMagnetGridIndex(x, y - DRAG_Y_OFFSET);
                
                // 기존 하이라이트 제거
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                
                // 유효한 위치라면 하이라이트 표시 (Preview)
                if (idx !== -1) {
                    onDrop(idx, true); 
                }
            }

            const moveHandler = (me) => {
                if(me.cancelable) me.preventDefault(); // 스크롤 방지
                const p = getPos(me);
                moveGhost(p.x, p.y);
            };

            const endHandler = (ee) => {
                // 이벤트 제거
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchend', endHandler);

                const p = getPos(ee);
                // 최종 드롭 위치 계산
                const idx = getMagnetGridIndex(p.x, p.y - DRAG_Y_OFFSET);
                
                let success = false;
                if (idx !== -1) {
                    // 실제 드롭 시도
                    success = onDrop(idx, false); 
                }

                ghost.style.display = 'none';
                if (!success) {
                    slot.style.opacity = '1'; // 실패 시 원본 복귀
                }
                // 하이라이트 제거
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

// [핵심] 마그네틱 좌표 계산 (범위 보정 포함)
export function getMagnetGridIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    
    const rect = grid.getBoundingClientRect();

    // 1. 그리드 영역을 너무 많이 벗어났는지 확인 (여유 범위 50px)
    if (x < rect.left - 50 || x > rect.right + 50 || y < rect.top - 50 || y > rect.bottom + 50) {
        return -1;
    }

    const cellSize = getActualCellSize();
    
    // 테두리 패딩(padding) 값 가져오기
    const style = window.getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    // 2. 좌표를 그리드 내부 로컬 좌표로 변환
    let relX = x - rect.left - paddingLeft;
    let relY = y - rect.top - paddingTop;

    // 3. [마그네틱 효과의 핵심] Clamp (범위 제한)
    // 손가락이 그리드 경계선 살짝 밖이어도, 가장 가까운 끝 칸으로 인식하게 함
    const maxPos = cellSize * state.gridSize - 1; 
    
    relX = Math.max(0, Math.min(relX, maxPos));
    relY = Math.max(0, Math.min(relY, maxPos));
    
    // 4. 인덱스 계산
    const c = Math.floor(relX / cellSize);
    const r = Math.floor(relY / cellSize);

    // 유효 범위 체크
    if (r >= 0 && r < state.gridSize && c >= 0 && c < state.gridSize) {
        return r * state.gridSize + c;
    }
    return -1;
}

// UI 정보 업데이트 (별, 최고 기록 등)
export function updateUI() {
    // 1. 별 개수 업데이트
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;

    // 2. [추가됨] 현재 게임의 최고 알파벳 표시
    const bestEl = document.getElementById('game-best-char');
    if(bestEl) bestEl.textContent = state.best;
}
