import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

let draggedBlock = null;
let currentScale = 1; 

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

// js/game-ui.js 의 updateUI 함수 부분

export function updateUI() {
    // 1. 점수판 업데이트
    const scoreEl = document.getElementById('ui-score');
    const bestEl = document.getElementById('ui-best');
    const starEl = document.getElementById('ui-stars');
    const diffEl = document.getElementById('ui-diff');

    if (scoreEl) scoreEl.textContent = state.score;
    if (bestEl) bestEl.textContent = state.best;
    if (starEl) starEl.textContent = state.stars;
    if (diffEl) diffEl.textContent = state.diff;
    
    // 2. [핵심 수정] 아이템 개수 업데이트 (HTML의 span ID를 찾아서 넣기)
    const cntRef = document.getElementById('cnt-refresh');
    const cntHam = document.getElementById('cnt-hammer');
    const cntUp = document.getElementById('cnt-upgrade');

    // state.items가 없으면 0으로 처리
    const items = state.items || { refresh: 0, hammer: 0, upgrade: 0 };

    if (cntRef) cntRef.textContent = items.refresh;
    if (cntHam) cntHam.textContent = items.hammer;
    if (cntUp) cntUp.textContent = items.upgrade;

    // 3. 상점 광고 버튼 (기존 코드 유지)
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
    
    const idx = parseInt(blockEl.dataset.index);
    if(isNaN(idx) || state.hand[idx] === null) return;

    state.dragIndex = idx;
    draggedBlock = blockEl.cloneNode(true);
    
    // [크기 계산]
    const boardCell = document.querySelector('.cell');
    let targetScale = 1.0;
    
    // 그리드 전체 영역 정보 가져오기 (좌표 계산용)
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
        // 블록의 정중앙이 손가락 위에 오도록 배치
        draggedBlock.style.left = (pageX - draggedBlock.offsetWidth / 2) + 'px';
        draggedBlock.style.top = (pageY - draggedBlock.offsetHeight / 2 - TOUCH_OFFSET_Y) + 'px'; 
    }

    // [핵심 로직: 첫 번째 칸(Top-Left) 중심 기준 자석]
    function getMagnetIndex() {
        if (!gridRect || !boardCell) return -1;

        // 1. 현재 떠 있는 블록의 실제 위치 가져오기
        const blockRect = draggedBlock.getBoundingClientRect();
        
        // 2. 화면상 1칸의 크기 계산
        const cellSize = gridRect.width / state.gridSize;

        // 3. "첫 번째 칸(0,0)"의 중심점 좌표 구하기
        // blockRect.left는 블록의 왼쪽 끝입니다.
        // 여기에 cellSize 절반을 더하면 첫 번째 칸의 중심 X좌표가 됩니다.
        const firstCellCenterX = blockRect.left + (cellSize / 2);
        const firstCellCenterY = blockRect.top + (cellSize / 2);

        // 4. 이 점이 보드판의 몇 번째 칸에 있는지 계산
        const relativeX = firstCellCenterX - gridRect.left;
        const relativeY = firstCellCenterY - gridRect.top;

        const col = Math.floor(relativeX / cellSize);
        const row = Math.floor(relativeY / cellSize);

        // 5. 범위 체크
        if (col < 0 || col >= state.gridSize || row < 0 || row >= state.gridSize) {
            return -1;
        }

        // 6. 결과 반환 (이 위치가 곧 블록의 시작점)
        return row * state.gridSize + col;
    }

    function onMove(event) {
        if(event.cancelable) event.preventDefault();

        const cx = isTouch ? event.touches[0].clientX : event.clientX;
        const cy = isTouch ? event.touches[0].clientY : event.clientY;
        
        moveAt(cx, cy);

        // 하이라이트 초기화
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        draggedBlock.style.visibility = 'hidden';

        // 새로운 자석 좌표 계산
        const targetIdx = getMagnetIndex();

        draggedBlock.style.visibility = 'visible';

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
        
        const targetIdx = getMagnetIndex();
        
        draggedBlock.style.visibility = 'hidden';

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
