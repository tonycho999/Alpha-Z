import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

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

// [핵심 수정된 팝업 함수]
function showGameOverPopup() {
    // [수정 1] 여기서 localStorage 삭제 코드 제거함! (부활을 위해 데이터 보존)
    // localStorage.removeItem('alpha_gamestate');  <-- 삭제됨
    // localStorage.removeItem('alpha_score');      <-- 삭제됨

    const popup = document.getElementById('popup-over');
    if(popup) popup.style.display = 'flex';
    
    // [수정 2] 이번 판의 최고 블록 표시
    const bestEl = document.getElementById('over-best');
    if(bestEl) bestEl.textContent = state.currentMax; 
    
    const saveMsg = document.getElementById('save-msg');
    if(saveMsg) saveMsg.style.display = 'none';

    // 유저 UI 처리 (신규/기존 유저 구분에 따라 입력창 표시)
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

    // [수정 3] 부활 버튼 로직 정리
    const btnRevive = document.getElementById('btn-revive-ad');
    if(btnRevive) {
        const adStatus = AdManager.checkAdStatus();
        
        if(state.hasRevived) {
             // 이미 부활했으면 버튼 숨김
             btnRevive.style.display = 'none';
        } else if (!adStatus.avail && !state.isAdmin) {
             // 광고 없음
             btnRevive.style.display = 'block';
             btnRevive.disabled = true;
             btnRevive.style.opacity = '0.5';
             btnRevive.textContent = `🚫 ${adStatus.msg}`;
        } else {
            // 부활 가능
            btnRevive.style.display = 'block';
            btnRevive.disabled = false;
            btnRevive.style.opacity = '1';
            btnRevive.textContent = "📺 Revive (Get 1x1 Block)";
            
            // 클릭 시 메인 로직의 부활 함수 호출 (AdManager 중복 호출 방지)
            btnRevive.onclick = () => {
                if(window.gameLogic && window.gameLogic.tryReviveWithAd) {
                    window.gameLogic.tryReviveWithAd();
                }
            };
        }
    }
}

export function nextTurn() { checkHandAndRefill(); }

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

        // 범위를 벗어나거나 이미 블록이 있으면 불가능
        if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { 
            possible = false; break; 
        }
        finalIndices.push(tidx);
    }

    if (!possible) return false;

    // 2. 실제 배치 (isPreview는 현재 사용하지 않지만 호환성을 위해 유지)
    if(isPreview) {
        // (game-ui.js에서 처리하므로 여기서는 true만 리턴해도 됨)
        return true;
    } else {
        // 블록 배치 실행
        Logic.placeBlock(finalIndices, block, checkHandAndRefill);
        return true;
    }
}
