import { state } from "./game-data.js";
import { getCluster } from "./game-core.js"; // 예측 계산용

// ... (getActualCellSize, renderGrid, renderHand 기존 유지) ...

// [설정] 드래그 시 손가락 위로 띄우는 거리 (화면 가림 방지)
const DRAG_Y_OFFSET = 100; 

export function setupDrag(onDrop) {
    const ghost = document.getElementById('ghost');
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`hand-${i}`);
        if(!slot) continue;
        slot.onmousedown = null; slot.ontouchstart = null; // 중복 방지

        if (!state.hand[i]) continue; 

        const start = (e) => {
            if(state.isLocked) return;
            state.dragIndex = i; 
            const cellSize = getActualCellSize(); // 현재 그리드 칸 크기
            const block = state.hand[i];
            
            // 1. 고스트(미리보기) 설정 - 그리드 크기에 딱 맞게!
            ghost.innerHTML = '';
            ghost.style.position = 'fixed'; 
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = `repeat(${block.shape.w}, ${cellSize}px)`;
            ghost.style.gridTemplateRows = `repeat(${block.shape.h}, ${cellSize}px)`;
            ghost.style.gap = '2px';
            ghost.style.zIndex = '9999';
            ghost.style.opacity = '0.8'; // 약간 투명하게
            ghost.style.pointerEvents = 'none';

            block.items.forEach((char, idx) => {
                const b = document.createElement('div');
                b.className = `cell b-${char}`;
                b.textContent = char;
                // 폰트 사이즈도 셀 크기에 맞춰 조정
                b.style.fontSize = (cellSize * 0.5) + 'px'; 
                b.style.gridColumnStart = block.shape.map[idx][1] + 1;
                b.style.gridRowStart = block.shape.map[idx][0] + 1;
                ghost.appendChild(b);
            });
            
            slot.style.opacity = '0'; // 원본 숨김

            const getPos = (ev) => {
                const t = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
                return { x: t.clientX, y: t.clientY };
            };
            
            // 초기 위치 설정
            const pos = getPos(e);
            moveGhost(pos.x, pos.y);

            function moveGhost(x, y) {
                // 고스트는 손가락보다 위에 위치 (가림 방지)
                const w = ghost.offsetWidth;
                const h = ghost.offsetHeight;
                ghost.style.left = (x - w/2) + 'px';
                ghost.style.top = (y - h/2 - DRAG_Y_OFFSET) + 'px'; 
                
                // [자석 효과] 계산된 인덱스 가져오기
                // y좌표 보정: 시각적으로 보이는 ghost 위치를 기준으로 판정
                const idx = getMagnetGridIndex(x, y - DRAG_Y_OFFSET);
                
                // 기존 하이라이트/이펙트 초기화
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                document.querySelectorAll('.will-merge').forEach(c => c.classList.remove('will-merge'));

                if (idx !== -1) { 
                    // [기능 추가] 합체 예측 시각화 (빛나는 효과)
                    showMergePrediction(idx, block);
                    onDrop(idx, true); // 미리보기 실행
                }
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
                
                // 이펙트 정리
                document.querySelectorAll('.highlight-valid').forEach(c => c.classList.remove('highlight-valid'));
                document.querySelectorAll('.will-merge').forEach(c => c.classList.remove('will-merge'));
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

// [핵심 개선] 자석 좌표 계산 (중심점 거리 기반)
export function getMagnetGridIndex(x, y) {
    const grid = document.getElementById('grid-container');
    if (!grid) return -1;
    
    const rect = grid.getBoundingClientRect();
    const cellSize = getActualCellSize();
    
    // 그리드 내부 패딩 고려
    const style = window.getComputedStyle(grid);
    const pLeft = parseFloat(style.paddingLeft);
    const pTop = parseFloat(style.paddingTop);

    // 터치한 좌표(블록의 중심)가 그리드 영역 안에 있는지 대략 체크 (여유 50px)
    if (x < rect.left - 50 || x > rect.right + 50 || y < rect.top - 50 || y > rect.bottom + 50) {
        return -1;
    }

    // 그리드 내부 로컬 좌표
    const localX = x - rect.left - pLeft;
    const localY = y - rect.top - pTop;

    // 현재 좌표가 속한 행/열 계산
    const c = Math.floor(localX / cellSize);
    const r = Math.floor(localY / cellSize);

    // 유효 범위 체크
    if (c >= 0 && c < state.gridSize && r >= 0 && r < state.gridSize) {
        // [정밀 보정] 터치 포인트가 해당 셀의 '중심'에서 너무 멀면 무효 처리 (오작동 방지)
        // 셀의 중심 좌표
        const cellCenterX = (c * cellSize) + (cellSize / 2);
        const cellCenterY = (r * cellSize) + (cellSize / 2);
        
        // 거리 계산 (피타고라스)
        const dist = Math.sqrt(Math.pow(localX - cellCenterX, 2) + Math.pow(localY - cellCenterY, 2));
        
        // 셀 크기의 65% 반경 안에 들어와야 자석 발동 (쫀쫀한 느낌)
        if (dist < cellSize * 0.65) {
            return r * state.gridSize + c;
        }
    }
    return -1;
}

// [추가] 합체 예측 효과 표시
function showMergePrediction(idx, block) {
    const size = state.gridSize;
    const r = Math.floor(idx / size);
    const c = idx % size;

    // 1. 내가 놓을 자리 하이라이트
    for(let i=0; i<block.items.length; i++) {
        const tr = r + block.shape.map[i][0];
        const tc = c + block.shape.map[i][1];
        if(tr >= size || tc >= size) continue;
        
        const targetIdx = tr * size + tc;
        // 이미 블록이 있으면 패스 (놓을 수 없는 자리)
        if (state.grid[targetIdx]) continue;

        const cell = document.getElementById(`cell-${targetIdx}`);
        if (cell) cell.classList.add('highlight-valid');

        // 2. 주변에 같은 알파벳이 있어서 합쳐질 것 같은가?
        const myChar = block.items[i];
        const neighbors = [targetIdx-1, targetIdx+1, targetIdx-size, targetIdx+size];
        
        let willMerge = false;
        neighbors.forEach(n => {
            if(n >= 0 && n < size*size) {
                // 좌우 경계 넘임 체크
                if(Math.abs((n%size) - (targetIdx%size)) > 1) return;
                
                // 같은 알파벳이 있으면 반응!
                if(state.grid[n] === myChar) {
                    willMerge = true;
                    // 주변 친구도 빛나게
                    const friend = document.getElementById(`cell-${n}`);
                    if(friend) friend.classList.add('will-merge');
                }
            }
        });

        // 합쳐질 예정이면 내 자리도 강하게 빛남
        if (willMerge && cell) cell.classList.add('will-merge');
    }
}

export function updateUI() {
    const starEl = document.getElementById('idx-stars');
    if(starEl) starEl.textContent = state.stars;

    const bestEl = document.getElementById('game-best-char');
    if(bestEl) bestEl.textContent = state.best;
    
    // [추가] 점수 표시 (헤더에 추가 공간이 필요할 수 있음)
    // game.html의 헤더에 id="ui-score"를 가진 요소를 추가하면 좋습니다.
    const scoreEl = document.getElementById('ui-score');
    if(scoreEl) scoreEl.textContent = state.score;

    const popup = document.getElementById('popup-over');
    if (popup && popup.style.display !== 'none') {
        if(window.updateGameOverUI) window.updateGameOverUI();
    }
}
