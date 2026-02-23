import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// [셀 클릭 (망치)]
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        const gridContainer = document.getElementById('grid-container');
        if(gridContainer) gridContainer.classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
        
        // 망치 사용 후 빈 공간이 생겼으므로 핸드 체크
        checkHandAndRefill();
    }
}

// [핸드 확인 및 리필]
export function checkHandAndRefill() {
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        // 핸드가 다 비었으면 새로 채움
        state.hand = [ Core.createRandomBlock(), Core.createRandomBlock(), Core.createRandomBlock() ];
        UI.renderHand();
        Logic.saveGameState(); 
    }
    
    // 핸드 상태가 변했으므로 드래그 이벤트 재연결
    UI.setupDrag(handleDropAttempt); 
    
    // 게임 오버 여부 확인
    checkGameOver();
}

// [게임 오버 체크]
export function checkGameOver() {
    let canPlace = false;
    
    // 1. 핸드에 있는 블록 중 하나라도 놓을 곳이 있는지 확인
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            if (Core.canPlaceAnywhere(state.hand[i])) { 
                canPlace = true; 
                break; 
            }
        }
    }
    
    // 2. 핸드가 비어있지 않은데 놓을 곳이 없으면 게임 오버
    const isHandEmpty = state.hand.every(b => b === null);
    if (!canPlace && !isHandEmpty) {
        AudioMgr.play('over');
        showGameOverPopup();
    }
}

// [게임 오버 팝업 표시 (테스트 모드 수정됨)]
function showGameOverPopup() {
    // [수정 1] 데이터 삭제 코드 제거 (부활 테스트를 위해 보존)
    // localStorage.removeItem('alpha_gamestate'); 
    // localStorage.removeItem('alpha_score');

    // 1. 팝업 표시
    const popup = document.getElementById('popup-over');
    if(popup) popup.style.display = 'flex';
    
    // 2. 점수 표시 (이번 판 최고 기록)
    const bestEl = document.getElementById('over-best');
    if(bestEl) bestEl.textContent = state.currentMax; 
    
    const saveMsg = document.getElementById('save-msg');
    if(saveMsg) saveMsg.style.display = 'none';

    // 3. 유저 UI 처리 (신규/기존 유저)
    const name = localStorage.getItem('alpha_username');
    const existArea = document.getElementById('area-exist-user');
    const newArea = document.getElementById('area-new-user');
    const badge = document.getElementById('user-badge');

    if(name) {
         if(existArea) existArea.style.display = 'block';
         if(newArea) newArea.style.display = 'none';
         if(badge) badge.textContent = name;
    } else {
         if(existArea) existArea.style.display = 'none';
         if(newArea) newArea.style.display = 'block';
    }

    // 4. [수정 2] 부활 버튼 (광고 제거 & 즉시 부활)
    const btnRevive = document.getElementById('btn-revive-ad');
    if(btnRevive) {
        if(state.hasRevived) {
             // 이미 부활했으면 숨김
             btnRevive.style.display = 'none';
        } else {
            // [테스트 모드] 무조건 버튼 활성화
            btnRevive.style.display = 'block';
            btnRevive.disabled = false;
            btnRevive.style.opacity = '1';
            btnRevive.textContent = "⚡ Revive (TEST: No Ad)";
            
            // [핵심] 광고 없이 즉시 부활 로직 실행
            btnRevive.onclick = () => {
                // game-main.js의 tryReviveWithAd가 광고를 포함하고 있을 수 있으므로,
                // 여기서 직접 부활 로직을 실행하여 확실하게 광고를 건너뜁니다.
                
                console.log("⚡ Test Mode: Reviving immediately...");
                
                state.hasRevived = true;
                
                // 중앙 3x3 비우기
                const center = Math.floor(state.gridSize/2);
                for(let r=center-1; r<=center+1; r++){
                    for(let c=center-1; c<=center+1; c++){
                        const idx = r*state.gridSize+c;
                        if(idx>=0 && idx<state.grid.length) state.grid[idx] = null;
                    }
                }
                
                // 팝업 닫기 및 저장
                document.getElementById('popup-over').style.display = 'none';
                Logic.saveGameState();
                UI.renderGrid();
                checkHandAndRefill();
                UI.updateUI();
                
                AudioMgr.play('merge'); // 부활 성공 효과음
            };
        }
    }
}

export function nextTurn() { checkHandAndRefill(); }

// [블록 드롭 시도]
export function handleDropAttempt(targetIdx, isPreview) {
    if(state.dragIndex === -1) return false;
    const block = state.hand[state.dragIndex];
    if (!block) return false;

    const size = state.gridSize;
    const r = Math.floor(targetIdx / size);
    const c = targetIdx % size;
    const shape = block.shape;
    let finalIndices = [];
    let possible = true;
    
    // 1. 배치 가능 여부 확인
    for (let i = 0; i < shape.map.length; i++) {
        const tr = r + shape.map[i][0];
        const tc = c + shape.map[i][1];
        const tidx = tr * size + tc;

        if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { 
            possible = false; break; 
        }
        finalIndices.push(tidx);
    }

    if (!possible) return false;

    // 2. 미리보기(Highlight)는 game-ui.js에서 처리하므로 여기서는 pass
    if(isPreview) {
        return true;
    } else {
        // 실제 배치 실행
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
