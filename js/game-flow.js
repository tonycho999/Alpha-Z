import { state, ALPHABET } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// ... (handleCellClick 유지) ...

export function checkHandAndRefill() {
    // 1. 핸드가 비었는지 확인 (모두 null이면)
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        // 3개 생성
        state.hand = [
            Core.createRandomBlock(),
            Core.createRandomBlock(),
            Core.createRandomBlock()
        ];
        
        // UI 렌더링 및 드래그 연결
        UI.renderHand();
        UI.setupDrag(handleDropAttempt);

        // [게임 오버 체크]
        // 새로 받은 3개 중 하나라도 놓을 곳이 있는지 검사
        checkGameOver();
    } else {
        // 비어있지 않아도, 남은 블록들로 게임오버인지 체크해야 함
        checkGameOver();
    }
}

// [게임 오버 체크 로직 수정]
function checkGameOver() {
    let canPlace = false;
    
    // 현재 핸드에 남아있는 모든 블록에 대해 가능성 검사
    for (let i = 0; i < 3; i++) {
        if (state.hand[i] !== null) {
            if (Core.canPlaceAnywhere(state.hand[i])) {
                canPlace = true;
                break;
            }
        }
    }

    if (!canPlace) {
        AudioMgr.play('over');
        document.getElementById('popup-over').style.display = 'flex';
        // ... (게임오버 UI 처리) ...
    }
}


export function nextTurn() {
    // 기존 nextTurn 로직 대체 -> 핸드 체크 및 리필
    checkHandAndRefill();
}

// [수정] handleDropAttempt
// isPreview: true(드래그중), false(드롭함)
export function handleDropAttempt(targetIdx, isPreview) {
    // 현재 드래그 중인 블록 가져오기
    const block = state.hand[state.dragIndex];
    if (!block) return false;

    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = block.shape; // [변경] state.currentBlock -> block
    let finalIndices = null;

    // 위치 계산 로직 (기존과 동일)
    for (let i = 0; i < shape.map.length; i++) {
        const anchorR = r - shape.map[i][0], anchorC = c - shape.map[i][1];
        let possible = true, temp = [];
        for (let j = 0; j < shape.map.length; j++) {
            const tr = anchorR + shape.map[j][0], tc = anchorC + shape.map[j][1];
            const tidx = tr * size + tc;
            if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx] !== null) { possible = false; break; }
            temp.push(tidx);
        }
        if (possible) { finalIndices = temp; break; }
    }

    if(!finalIndices) return false;

    if(isPreview) {
        // 하이라이트 표시
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });
        return true;
    } else {
        // 실제 배치
        placeBlock(finalIndices, block); // 블록 객체 전달
        return true;
    }
}

async function placeBlock(indices, block) {
    state.isLocked = true;
    AudioMgr.play('drop');

    // 1. 그리드에 배치
    indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
    
    // 2. 사용한 블록을 핸드에서 제거 (null 처리)
    state.hand[state.dragIndex] = null;
    
    // 3. UI 업데이트 (그리드 + 핸드)
    UI.renderGrid();
    UI.renderHand(); // 사용된 블록이 사라짐
    // 아직 드래그는 다시 연결하지 않음 (애니메이션 중 클릭 방지)

    await wait(300);

    const newIndices = indices;
    let checkAgain = true;
    
    while(checkAgain) {
        checkAgain = false;
        
        // --- 병합 로직 (기존 유지) ---
        let merged = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cluster = Core.getCluster(i);
                if(cluster.length >= 2) {
                    await processMerge(cluster, newIndices);
                    merged = true; break; 
                }
            }
        }
        if(merged) { checkAgain = true; continue; }

        // --- 자동 승급 로직 (수정됨) ---
        const minIdx = Core.getMinIdx();
        let upgraded = false;
        
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                state.grid[i] = ALPHABET[minIdx];
                upgraded = true;
                const cell = document.getElementById(`cell-${i}`);
                if(cell) { 
                    cell.classList.add('merging-source'); 
                    setTimeout(()=>cell.classList.remove('merging-source'), 300); 
                }
            }
        }
        
        if(upgraded) { 
            // [핵심] 승급이 발생하면 남은 블록들(null이 아닌 것들)을 즉시 교체
            refreshRemainingHand();
            
            UI.renderGrid(); 
            await wait(300); 
            checkAgain = true; 
        }
    }
    
    state.isLocked = false;
    
    // 턴 종료 -> 핸드 체크 및 리필
    // 이때 UI.setupDrag가 다시 호출되어 남은 블록들에 이벤트가 연결됨
    checkHandAndRefill();
}

// [신규 함수] 남은 블록 교체 (승급 시 호출)
function refreshRemainingHand() {
    let hasChange = false;
    for(let i=0; i<3; i++) {
        // 아직 사용하지 않은(null이 아닌) 블록이 있다면
        if (state.hand[i] !== null) {
            // 새로운 난이도(minIdx)가 반영된 새 블록으로 교체
            state.hand[i] = Core.createRandomBlock();
            hasChange = true;
        }
    }
    
    if (hasChange) {
        UI.renderHand();
        // 효과음 살짝 주면 좋음
        AudioMgr.play('merge'); // 또는 다른 리프레시 사운드
    }
}

// ... (processMerge, wait 함수 유지) ...
async function processMerge(cluster, newIndices) {
    AudioMgr.play('merge');
    // ... (기존 병합 로직 동일) ...
    // ...
    // 병합 후 렌더링
    UI.renderGrid();
    UI.updateUI();
    await wait(200);
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
