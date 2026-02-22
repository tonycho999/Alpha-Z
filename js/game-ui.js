import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

let draggedBlock = null;

export function renderGrid() {
    const container = document.getElementById('grid-container');
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
    container.innerHTML = '';
    
    state.hand.forEach((block, idx) => {
        const slot = document.createElement('div');
        slot.classList.add('hand-slot');
        // 슬롯에도 인덱스는 남겨둠 (참조용)
        slot.dataset.index = idx;

        if (block) {
            const preview = createBlockPreview(block);
            // 블록 자체에 인덱스를 명확히 부여
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
    
    // [중요 수정] 블록 자체가 클릭을 받아야 하므로 pointerEvents 'none' 제거
    // wrapper.style.pointerEvents = 'none'; (삭제됨)
    wrapper.style.cursor = 'grab'; 
    
    // [중요 수정] 모바일에서 드래그 시 화면 스크롤 방지
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
    document.getElementById('score-val').textContent = state.score;
    document.getElementById('best-val').textContent = state.best;
    document.getElementById('star-val').textContent = state.stars;
    
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

// [수정된 setupDrag: 블록(div) 자체에 이벤트 연결]
export function setupDrag(onDrop) {
    // .hand-slot 안에 있는 div(블록)만 정확히 타겟팅
    const blocks = document.querySelectorAll('.hand-slot > div');
    
    blocks.forEach(block => {
        // 기존 이벤트 제거 (안전장치)
        block.onmousedown = null;
        block.ontouchstart = null;

        block.onmousedown = e => startDrag(e, block, false, onDrop);
        block.ontouchstart = e => startDrag(e, block, true, onDrop);
    });
}

function startDrag(e, blockEl, isTouch, onDrop) {
    if(state.isLocked) return;
    
    // 이벤트 전파 방지 (중복 클릭 방지)
    e.stopPropagation(); 
    if (e.cancelable) e.preventDefault();
    
    // 블록 자체에 있는 data-index 사용
    const idx = parseInt(blockEl.dataset.index);
    if(isNaN(idx) || state.hand[idx] === null) return;

    state.dragIndex = idx;
    draggedBlock = blockEl.cloneNode(true);
    
    draggedBlock.style.position = 'fixed';
    draggedBlock.style.zIndex = '9999'; // z-index 최상위 보장
    draggedBlock.style.pointerEvents = 'none'; // 드래그 중인 유령은 클릭 통과
    draggedBlock.style.opacity = '0.9';
    draggedBlock.style.transform = 'scale(1.1)'; 
    
    document.body.appendChild(draggedBlock);

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    moveAt(clientX, clientY);

    function moveAt(pageX, pageY) {
        draggedBlock.style.left = pageX - draggedBlock.offsetWidth / 2 + 'px';
        draggedBlock.style.top = pageY - draggedBlock.offsetHeight / 2 + 'px';
    }

    function onMove(event) {
        if(event.cancelable) event.preventDefault();

        const cx = isTouch ? event.touches[0].clientX : event.clientX;
        const cy = isTouch ? event.touches[0].clientY : event.clientY;
        moveAt(cx, cy);

        // 하이라이트 제거
        document.querySelectorAll('.highlight-valid').forEach(el => el.classList.remove('highlight-valid'));
        document.querySelectorAll('.will-merge').forEach(el => el.classList.remove('will-merge'));

        // 드래그 중인 요소 숨기고 아래 요소 확인
        draggedBlock.style.visibility = 'hidden';
        const elemBelow = document.elementFromPoint(cx, cy);
        draggedBlock.style.visibility = 'visible';

        if(elemBelow) {
            const cell = elemBelow.closest('.cell');
            if(cell) {
                const cellId = parseInt(cell.id.split('-')[1]);
                onDrop(cellId, true); // 미리보기
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
        const elemBelow = document.elementFromPoint(cx, cy);
        
        if(elemBelow) {
            const cell = elemBelow.closest('.cell');
            if(cell) {
                const cellId = parseInt(cell.id.split('-')[1]);
                dropped = onDrop(cellId, false); // 실제 드롭
            }
        }

        if (draggedBlock) {
            draggedBlock.remove();
            draggedBlock = null;
        }
        if(!dropped) state.dragIndex = -1; 
    }

    // passive: false 필수 (모바일 스크롤 방지)
    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, {passive: false});
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
}
