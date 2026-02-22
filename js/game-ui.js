import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

let draggedBlock = null;
let currentScale = 1; 

// 손가락보다 얼마나 위로 띄울지 (시야 확보)
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
    
    const idx = parseInt(blockEl.dataset.index);
    if(isNaN(idx) || state.hand[idx] === null) return;

    state.dragIndex = idx;
    draggedBlock = blockEl.cloneNode(true);
    
    // [크기 계산]
    const boardCell = document.querySelector('.cell');
    let targetScale = 1.0;
    if (boardCell) {
        const cellWidth = boardCell.offsetWidth;
        targetScale = cellWidth / 25; 
    }
    currentScale = targetScale;

    draggedBlock.style.position = 'fixed';
    draggedBlock.style.zIndex = '9999'; 
    draggedBlock.style.pointerEvents = 'none'; 
    draggedBlock.style.opacity = '0.9';
    // 확대 적용 (중심점 기준)
    draggedBlock.style.transform = `scale(${targetScale})`; 
    draggedBlock.style.transformOrigin = 'center center'; 
    draggedBlock.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)';

    document.body.appendChild(draggedBlock);

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    moveAt(clientX, clientY);

    function moveAt(pageX, pageY) {
        // [오차 해결 핵심]
        // visualWidth(확대된 크기)를 빼는 게 아니라, offsetWidth(원래 크기)의 절반을 빼야
        // transformOrigin: center와 맞물려 정확히 중앙에 위치합니다.
        
        draggedBlock.style.left = (pageX - draggedBlock.offsetWidth / 2) + 'px';
        draggedBlock.style.top = (pageY - draggedBlock.offsetHeight / 2 - TOUCH_OFFSET_Y) + 'px'; 
    }

    function onMove(event) {
        if(event.cancelable) event.preventDefault();

        const cx = isTouch ? event.touches[0].clientX : event.clientX;
        const cy = isTouch ? event.touches[0].clientY : event.clientY;
        
        moveAt(cx, cy);

        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        draggedBlock.style.visibility = 'hidden';

        // [자석 감지 좌표] 손가락 위치가 아니라 '블록이 떠 있는 위치' 기준
        const sensorX = cx;
        const sensorY = cy - TOUCH_OFFSET_Y;

        const elemBelow = document.elementFromPoint(sensorX, sensorY);
        draggedBlock.style.visibility = 'visible';

        if(elemBelow) {
            const cell = elemBelow.closest('.cell');
            if(cell) {
                const cellId = parseInt(cell.id.split('-')[1]);
                onDrop(cellId, true); 
            }
        }
    }

    function onEnd(event) {
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
        
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        let dropped = false;
        
        const cx = isTouch ? event.changedTouches[0].clientX : event.clientX;
        const cy = isTouch ? event.changedTouches[0].clientY : event.clientY;
        
        draggedBlock.style.visibility = 'hidden';

        const sensorX = cx;
        const sensorY = cy - TOUCH_OFFSET_Y;

        const elemBelow = document.elementFromPoint(sensorX, sensorY);
        
        if(elemBelow) {
            const cell = elemBelow.closest('.cell');
            if(cell) {
                const cellId = parseInt(cell.id.split('-')[1]);
                dropped = onDrop(cellId, false); 
            }
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
