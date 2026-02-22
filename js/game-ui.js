import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

let draggedBlock = null;
let currentScale = 1; 
let dragW = 1; 
let dragH = 1; 

// [설정] 손가락과 블록 사이 거리 (시야 확보)
const TOUCH_OFFSET_Y = 100; 

export function renderGrid() {
    const container = document.getElementById('grid-container');
    if (!container) return; 

    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${state.gridSize}, 1fr)`;

    state.grid.forEach((char, idx) => {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${idx}`;
        if (char) {
            cell.textContent = char;
            cell.classList.add(`b-${char}`);
        }
        cell.onclick = () => {
             if(state.isHammerMode && window.gameLogic) {
                 window.gameLogic.handleCellClick(idx);
             }
        };
        container.appendChild(cell);
    });
}

export function renderHand() {
    const container = document.getElementById('hand-container');
    if (!container) return; 

    container.innerHTML = '';
    
    state.hand.forEach((block, idx) => {
        const slot = document.createElement('div');
        slot.classList.add('hand-slot');
        slot.dataset.index = idx;
        
        if (block) {
            slot.dataset.w = block.shape.w;
            slot.dataset.h = block.shape.h;
            
            const preview = createBlockPreview(block);
            preview.dataset.index = idx; 
            slot.appendChild(preview);
        }
        container.appendChild(slot);
    });
}

function createBlockPreview(block) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = `repeat(${block.shape.w}, 25px)`;
    wrapper.style.gridTemplateRows = `repeat(${block.shape.h}, 25px)`;
    wrapper.style.gap = '2px';
    
    wrapper.style.cursor = 'grab'; 
    wrapper.style.touchAction = 'none'; 

    const map = block.shape.map;
    const w = block.shape.w;
    const h = block.shape.h;
    
    for(let r=0; r<h; r++) {
        for(let c=0; c<w; c++) {
            const isBlock = map.some(p => p[0]===r && p[1]===c);
            const cell = document.createElement('div');
            cell.style.width = '25px';
            cell.style.height = '25px';
            cell.style.borderRadius = '4px';
            
            if(isBlock) {
                const itemIndex = map.findIndex(p => p[0]===r && p[1]===c);
                const char = block.items[itemIndex];
                cell.className = `b-${char}`;
                cell.style.color = '#fff';
                cell.style.fontSize = '12px';
                cell.style.fontWeight = 'bold';
                cell.style.display = 'flex';
                cell.style.justifyContent = 'center';
                cell.style.alignItems = 'center';
                cell.textContent = char;
            } else {
                cell.style.background = 'transparent';
            }
            wrapper.appendChild(cell);
        }
    }
    return wrapper;
}

export function updateUI() {
    const scoreEl = document.getElementById('ui-score');
    const bestEl = document.getElementById('ui-best');
    const starEl = document.getElementById('ui-stars');
    const diffEl = document.getElementById('ui-diff');

    if (scoreEl) scoreEl.textContent = state.score;
    if (bestEl) bestEl.textContent = state.best;
    if (starEl) starEl.textContent = state.stars;
    if (diffEl) diffEl.textContent = state.diff;
    
    const rBtn = document.getElementById('btn-refresh');
    const hBtn = document.getElementById('btn-hammer');
    const uBtn = document.getElementById('btn-upgrade');

    if(rBtn) rBtn.innerHTML = `🔄 100<br>(${state.items.refresh})`;
    if(hBtn) hBtn.innerHTML = `🔨 200<br>(${state.items.hammer})`;
    if(uBtn) uBtn.innerHTML = `⬆️ 300<br>(${state.items.upgrade})`;

    const shopAdBtn = document.getElementById('btn-shop-ad');
    if(shopAdBtn) {
        const status = AdManager.checkAdStatus();
        if(!status.avail && !state.isAdmin) {
            shopAdBtn.disabled = true;
            shopAdBtn.style.opacity = '0.5';
            shopAdBtn.innerHTML = `📺 Free 50★<br><span style="font-size:0.7em">${status.msg}</span>`;
        } else {
            shopAdBtn.disabled = false;
            shopAdBtn.style.opacity = '1';
            shopAdBtn.innerHTML = `📺 Free 50★`;
            shopAdBtn.onclick = () => {
                AdManager.showRewardAd(() => {
                    state.stars += 50;
                    Logic.saveGameState();
                    updateUI();
                });
            };
        }
    }
}

export function setupDrag(onDrop) {
    const blocks = document.querySelectorAll('.hand-slot > div');
    
    blocks.forEach(block => {
        block.onmousedown = null;
        block.ontouchstart = null;

        block.onmousedown = e => startDrag(e, block, false, onDrop);
        block.ontouchstart = e => startDrag(e, block, true, onDrop);
    });
}

function startDrag(e, blockEl, isTouch, onDrop) {
    if(state.isLocked) return;
    
    e.stopPropagation(); 
    if (e.cancelable) e.preventDefault();
    
    const slot = blockEl.parentElement;
    const idx = parseInt(blockEl.dataset.index);
    if(isNaN(idx) || state.hand[idx] === null) return;

    dragW = parseInt(slot.dataset.w) || 1;
    dragH = parseInt(slot.dataset.h) || 1;

    state.dragIndex = idx;
    draggedBlock = blockEl.cloneNode(true);
    
    // [크기 계산]
    const boardCell = document.querySelector('.cell');
    let targetScale = 1.0;
    // 계산을 위해 실제 보드판의 좌표 정보를 가져옵니다.
    const gridContainer = document.getElementById('grid-container');
    const gridRect = gridContainer ? gridContainer.getBoundingClientRect() : null;

    if (boardCell) {
        const cellWidth = boardCell.offsetWidth;
        targetScale = cellWidth / 25; 
    }
    currentScale = targetScale;

    draggedBlock.style.position = 'fixed';
    draggedBlock.style.zIndex = '9999'; 
    draggedBlock.style.pointerEvents = 'none'; 
    draggedBlock.style.opacity = '0.9';
    draggedBlock.style.transform = `scale(${targetScale})`; 
    draggedBlock.style.transformOrigin = 'center center'; 
    draggedBlock.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)';

    document.body.appendChild(draggedBlock);

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    moveAt(clientX, clientY);

    function moveAt(pageX, pageY) {
        // 시각적 이동: 손가락 위에 블록 표시 (시야 확보)
        draggedBlock.style.left = (pageX - draggedBlock.offsetWidth / 2) + 'px';
        draggedBlock.style.top = (pageY - draggedBlock.offsetHeight / 2 - TOUCH_OFFSET_Y) + 'px'; 
    }

    // [진짜 자석 모드: 수학적 그리드 계산 함수]
    // 손가락 위치나 특정 점을 검사하는 게 아니라,
    // "떠 있는 블록의 중심"이 "보드판의 몇 행 몇 열"에 있는지를 수학적으로 계산합니다.
    function getMagnetIndex() {
        if (!gridRect || !boardCell) return -1;

        // 1. 현재 떠 있는 블록의 '시각적 중심 좌표' 계산
        // draggedBlock의 위치는 left, top에 저장되어 있음 (이미 TOUCH_OFFSET_Y 적용됨)
        const blockRect = draggedBlock.getBoundingClientRect();
        const blockCenterX = blockRect.left + blockRect.width / 2;
        const blockCenterY = blockRect.top + blockRect.height / 2;

        // 2. 보드판 내에서의 상대 좌표 (Relative Position)
        const relativeX = blockCenterX - gridRect.left;
        const relativeY = blockCenterY - gridRect.top;

        // 3. 현재 1칸의 실제 크기 (반응형 대응)
        const realCellSize = boardCell.offsetWidth; 
        // gap(여백)이 있다면 포함해서 계산해야 함. CSS gap이 5px라면 +5 필요할 수 있음.
        // 현재 CSS에서 gap: 5px; 라고 가정 시 미세 조정. (보통 cellWidth에 포함 안됨)
        // 안전하게 gridRect.width / gridSize 로 계산하는 게 가장 정확함.
        const calculatedCellSize = gridRect.width / state.gridSize;

        // 4. 행(Row), 열(Col) 계산 (반올림 사용 X, 내림 사용)
        // "블록의 중심이 위치한 칸"을 찾습니다.
        const centerCol = Math.floor(relativeX / calculatedCellSize);
        const centerRow = Math.floor(relativeY / calculatedCellSize);

        // 5. 범위 벗어남 체크
        if (centerCol < 0 || centerCol >= state.gridSize || 
            centerRow < 0 || centerRow >= state.gridSize) {
            return -1;
        }

        // 6. [핵심] 중심 좌표를 '앵커(Top-Left)' 좌표로 변환
        // 예: 가로 3칸짜리 블록의 중심을 잡고 있다면, 실제 놓일 위치(왼쪽 끝)는 중심에서 -1칸 옆임.
        const anchorCol = centerCol - Math.floor(dragW / 2);
        const anchorRow = centerRow - Math.floor(dragH / 2);

        // 7. 최종 인덱스 반환
        const targetIdx = anchorRow * state.gridSize + anchorCol;
        return targetIdx;
    }

    function onMove(event) {
        if(event.cancelable) event.preventDefault();

        const cx = isTouch ? event.touches[0].clientX : event.clientX;
        const cy = isTouch ? event.touches[0].clientY : event.clientY;
        
        // 1. 블록 이동
        moveAt(cx, cy);

        // 2. 하이라이트 초기화
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        // 3. 자석 좌표 계산 (elementFromPoint 사용 안 함!)
        const targetIdx = getMagnetIndex();

        // 4. 유효한 인덱스면 미리보기 실행
        if(targetIdx >= 0 && targetIdx < state.gridSize * state.gridSize) {
            onDrop(targetIdx, true); 
        }
    }

    function onEnd(event) {
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
        
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        let dropped = false;
        
        // 드롭 시에도 동일한 수학적 계산 사용
        const targetIdx = getMagnetIndex();
        
        if(targetIdx >= 0 && targetIdx < state.gridSize * state.gridSize) {
            dropped = onDrop(targetIdx, false); // 실제 드롭
        }

        if (draggedBlock) {
            draggedBlock.remove();
            draggedBlock = null;
        }
        if(!dropped) state.dragIndex = -1; 
    }

    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, {passive: false});
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
}
