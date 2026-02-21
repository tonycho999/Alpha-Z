import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";
// 순환 참조 방지를 위해 game-flow의 함수는 필요할 때 import하거나 콜백으로 처리해야 하지만,
// 여기서는 구조상 UI 업데이트와 데이터 조작 위주이므로 Flow 함수 호출을 최소화합니다.

// [1] 블록 배치 실행
export async function placeBlock(indices, block, onComplete) {
    if(state.isLocked) return;
    state.isLocked = true;
    
    try {
        AudioMgr.play('drop');

        // 1. 그리드 배치
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        
        // 2. 사용한 블록 제거 및 UI 갱신
        state.hand[state.dragIndex] = null;
        state.dragIndex = -1; // 드래그 상태 해제
        
        UI.renderGrid();
        UI.renderHand(); 
        
        await wait(200);

        // 3. 병합 및 승급 로직 (재귀적 처리 포함)
        await handleMerge(indices);

    } catch (e) {
        console.error("PlaceBlock Error:", e);
    } finally {
        state.isLocked = false;
        if(onComplete) onComplete(); // Flow 쪽의 checkHandAndRefill 호출
    }
}

// [2] 재귀적 합체 로직 (점수 + 스마트 위치 선정)
async function handleMerge(indices) {
    let merged = false;
    const nextGroup = new Map(); // 중복 방지용 (idx -> char)
    let scoreGained = 0; // 이번 턴 점수
    
    const uniqueIndices = [...new Set(indices)];

    for (let idx of uniqueIndices) {
        if (!state.grid[idx]) continue;

        const cluster = Core.getCluster(idx);
        if (cluster.length >= 3) {
            merged = true;
            const char = state.grid[idx];
            const nextIdxVal = ALPHABET.indexOf(char) + 1;
            const nextChar = ALPHABET[nextIdxVal];

            // [점수] 기본 10점 * 개수
            scoreGained += (10 * cluster.length);
            
            // 스마트 머지 위치 찾기
            let targetIdx = idx;
            let foundSmartSpot = false;

            if (nextChar) {
                for (let cIdx of cluster) {
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                        if (n >= 0 && n < state.grid.length && 
                            !cluster.includes(n) && 
                            state.grid[n] === nextChar) { 
                            targetIdx = cIdx; 
                            foundSmartSpot = true;
                            break;
                        }
                    }
                    if(foundSmartSpot) break;
                }
            }
            
            // 병합 연출
            const centerEl = document.getElementById(`cell-${targetIdx}`);
            for(let t of cluster) {
                if(t === targetIdx) continue;
                const el = document.getElementById(`cell-${t}`);
                if(el && centerEl) {
                    el.classList.add('merging-source');
                    el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
                    el.style.opacity = '0';
                }
            }
            await wait(300); 

            // 데이터 업데이트
            cluster.forEach(i => { state.grid[i] = null; });

            // 결과물 생성
            if (nextChar) {
                state.grid[targetIdx] = nextChar;
                nextGroup.set(targetIdx, nextChar); 
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                }
            } else {
                scoreGained += 500; // Z 제거 보너스
            }

            AudioMgr.play('merge');
        }
    }

    // [점수 반영]
    if (scoreGained > 0) {
        addScore(scoreGained);
        UI.renderGrid();
        UI.updateUI();
    }
    
    // 연쇄 반응 재귀 호출
    if (merged && nextGroup.size > 0) {
        await wait(150);
        await handleMerge(Array.from(nextGroup.keys()));
    } else {
        await checkAutoUpgrade();
    }
}

// [3] 자동 승급 체크
async function checkAutoUpgrade() {
    const minIdx = Core.getMinIdx();
    let upgraded = false;
    let upgradeIndices = [];

    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
            state.grid[i] = ALPHABET[minIdx];
            upgraded = true;
            upgradeIndices.push(i);
            
            const cell = document.getElementById(`cell-${i}`);
            if(cell) { 
                cell.classList.add('merging-source'); 
                setTimeout(()=>cell?.classList.remove('merging-source'), 300); 
            }
        }
    }
    
    if(upgraded) { 
        refreshRemainingHand(); 
        UI.renderGrid(); 
        await wait(300); 
        await handleMerge(upgradeIndices); 
    }
}

// [4] 점수 추가 및 스타 지급 (로컬 전용)
function addScore(amount) {
    state.score += amount;
    
    if (typeof state.earnedStars === 'undefined') state.earnedStars = 0;

    const neededScore = state.earnedStars * 1000 + 1000;
    if (state.score >= neededScore) {
        const starsToAdd = Math.floor((state.score - state.earnedStars * 1000) / 1000);
        if (starsToAdd > 0) {
            state.stars += starsToAdd;
            state.earnedStars += starsToAdd; 
            localStorage.setItem('alpha_stars', state.stars); 
        }
    }
}

function refreshRemainingHand() {
    let hasChange = false;
    for(let i=0; i<3; i++) {
        if (state.hand[i] !== null) {
            state.hand[i] = Core.createRandomBlock();
            hasChange = true;
        }
    }
    if (hasChange) {
        UI.renderHand();
        AudioMgr.play('merge'); 
    }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
