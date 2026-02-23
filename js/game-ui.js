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

export function updateUI() {
    const scoreEl = document.getElementById('ui-score');
    const bestEl = document.getElementById('ui-best');
    const starEl = document.getElementById('ui-stars');
    const diffEl = document.getElementById('ui-diff');

    if (scoreEl) scoreEl.textContent = state.score;
    if (bestEl) bestEl.textContent = state.currentMax; // Current Max 표시
    if (starEl) starEl.textContent = state.stars;
    if (diffEl) diffEl.textContent = state.diff;
    
    const cntRef = document.getElementById('cnt-refresh');
    const cntHam = document.getElementById('cnt-hammer');
    const cntUp = document.getElementById('cnt-upgrade');

    const items = state.items || { refresh: 0, hammer: 0, upgrade: 0 };

    if (cntRef) cntRef.textContent = items.refresh;
    if (cntHam) cntHam.textContent = items.hammer;
    if (cntUp) cntUp.textContent = items.upgrade;

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
    
    // [추가] 초기화 시 한번 UI 갱신 (아이템 개수 표시용)
    setTimeout(() => updateUI(), 100);
}

function startDrag(e, blockEl, isTouch, onDrop) {
    if(state.isLocked) return;
    
    e.stopPropagation(); 
    if (e.cancelable) e.preventDefault();
    
    const idx = parseInt(blockEl.dataset.index);
    if(isNaN(idx) || state.hand[idx] === null) return;

    state.dragIndex = idx;
    draggedBlock = blockEl.cloneNode(true);
    
    // 현재 잡고 있는 블록 정보 가져오기
    const handBlock = state.hand[idx];

    // 크기 계산
    const boardCell = document.querySelector('.cell');
    let targetScale = 1.0;
    
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
        draggedBlock.style.left = (pageX - draggedBlock.offsetWidth / 2) + 'px';
        draggedBlock.style.top = (pageY - draggedBlock.offsetHeight / 2 - TOUCH_OFFSET_Y) + 'px'; 
    }

    // 자석 인덱스 계산 (첫번째 칸 중심 기준)
    function getMagnetIndex() {
        if (!gridRect || !boardCell) return -1;

        const blockRect = draggedBlock.getBoundingClientRect();
        const cellSize = gridRect.width / state.gridSize;
        const firstCellCenterX = blockRect.left + (cellSize / 2);
        const firstCellCenterY = blockRect.top + (cellSize / 2);

        const relativeX = firstCellCenterX - gridRect.left;
        const relativeY = firstCellCenterY - gridRect.top;

        const col = Math.floor(relativeX / cellSize);
        const row = Math.floor(relativeY / cellSize);

        if (col < 0 || col >= state.gridSize || row < 0 || row >= state.gridSize) {
            return -1;
        }
        return row * state.gridSize + col;
    }

    // [핵심] 머지 가능 여부 및 위치 하이라이트 함수
    function highlightMergeCandidates(targetIdx) {
        // 1. 기존 하이라이트 제거
        document.querySelectorAll('.will-merge-target').forEach(el => el.classList.remove('will-merge-target'));
        draggedBlock.classList.remove('dragging-merge-active');

        if (targetIdx === -1) return;

        // 2. 블록이 놓일 위치 계산
        const cellsToCheck = [];
        const shape = handBlock.shape.map;
        
        // 현재 위치에 블록을 놓을 수 있는지, 그리고 어떤 칸들을 차지하는지 확인
        let isValid = true;
        for (let i = 0; i < shape.length; i++) {
            const [r, c] = shape[i];
            const gridIdx = targetIdx + (r * state.gridSize) + c;
            
            // 범위를 벗어나거나 이미 블록이 있으면 배치 불가
            const currentRow = Math.floor(targetIdx / state.gridSize) + r;
            const checkRow = Math.floor(gridIdx / state.gridSize);
            
            if (gridIdx < 0 || gridIdx >= state.grid.length || 
                currentRow !== checkRow || state.grid[gridIdx]) {
                isValid = false;
                break;
            }
            cellsToCheck.push({ idx: gridIdx, char: handBlock.items[i] });
        }

        if (!isValid) return;

        // 3. 머지될 주변 블록 찾기
        let mergeFound = false;
        
        cellsToCheck.forEach(item => {
            const centerIdx = item.idx;
            const char = item.char;
            
            // 상하좌우 이웃 확인
            const neighbors = [
                centerIdx - 1, centerIdx + 1, 
                centerIdx - state.gridSize, centerIdx + state.gridSize
            ];

            neighbors.forEach(nIdx => {
                // 이웃이 유효한 범위인지 확인
                if (nIdx >= 0 && nIdx < state.grid.length) {
                    // 좌우 경계 체크 (줄바꿈 방지)
                    if (Math.abs((centerIdx % state.gridSize) - (nIdx % state.gridSize)) > 1) return;
                    
                    // 이웃에 같은 알파벳이 있는지 확인
                    if (state.grid[nIdx] === char) {
                        // [하이라이트 적용] 보드판 위의 해당 블록
                        const el = document.getElementById(`cell-${nIdx}`);
                        if (el) {
                            el.classList.add('will-merge-target');
                            mergeFound = true;
                        }
                    }
                }
            });
        });

        // 4. 머지가 발견되면 드래그 중인 블록도 반짝이게
        if (mergeFound) {
            draggedBlock.classList.add('dragging-merge-active');
        }
    }

    function onMove(event) {
        if(event.cancelable) event.preventDefault();

        const cx = isTouch ? event.touches[0].clientX : event.clientX;
        const cy = isTouch ? event.touches[0].clientY : event.clientY;
        
        moveAt(cx, cy);

        // 자석 좌표 계산
        const targetIdx = getMagnetIndex();

        // [추가] 하이라이트 실행
        highlightMergeCandidates(targetIdx);
        
        // 유효성 시각적 표시 (반투명 처리 등)
        draggedBlock.style.visibility = 'hidden';
        const elemBelow = document.elementFromPoint(cx, cy); // 여기서는 단순 확인용
        draggedBlock.style.visibility = 'visible';
    }

    function onEnd(event) {
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
        
        // 종료 시 하이라이트 모두 제거
        document.querySelectorAll('.will-merge-target').forEach(el => el.classList.remove('will-merge-target'));
        if (draggedBlock) draggedBlock.classList.remove('dragging-merge-active');

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
