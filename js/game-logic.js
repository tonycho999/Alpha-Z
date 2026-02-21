import { state, ALPHABET } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// [1] 블록 배치 실행
export async function placeBlock(indices, block, onComplete) {
    if(state.isLocked) return;
    state.isLocked = true;
    
    try {
        AudioMgr.play('drop'); // 소리

        // 1. 그리드 배치
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        
        state.hand[state.dragIndex] = null;
        state.dragIndex = -1; 
        
        UI.renderGrid();
        UI.renderHand(); 
        
        await wait(200);

        // 2. 합체 로직
        await handleMerge(indices);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        state.isLocked = false;
        if(onComplete) onComplete(); 
    }
}

// [2] 합체 로직 (A+A=B, A+A+A=C)
async function handleMerge(indices) {
    let merged = false;
    const nextGroup = new Map();
    let scoreGained = 0;
    
    const uniqueIndices = [...new Set(indices)];

    for (let idx of uniqueIndices) {
        if (!state.grid[idx]) continue;

        const cluster = Core.getCluster(idx);
        
        // [중요 수정] 2개 이상이면 합체! (A+A=B)
        if (cluster.length >= 2) { 
            merged = true;
            const char = state.grid[idx];
            
            // [중요 로직] 2개면 +1단계(B), 3개면 +2단계(C), 4개면 +3단계(D)...
            // A(Index 0) + A(2개) -> Index 0 + (2-1) = 1 (B)
            // A(Index 0) + A + A (3개) -> Index 0 + (3-1) = 2 (C)
            const bonus = cluster.length - 1; 
            const nextIdxVal = ALPHABET.indexOf(char) + bonus;
            const nextChar = ALPHABET[nextIdxVal];

            scoreGained += (10 * cluster.length * bonus); // 점수도 보너스
            
            // 스마트 머지 위치 선정
            let targetIdx = idx;
            let foundSmartSpot = false;

            if (nextChar) {
                for (let cIdx of cluster) {
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                         // 주변에 결과물(nextChar)과 같은게 있으면 그쪽으로 붙음
                         if (n>=0 && n<state.grid.length && !cluster.includes(n) && state.grid[n] === nextChar) {
                             targetIdx = cIdx;
                             foundSmartSpot = true;
                             break;
                         }
                    }
                    if(foundSmartSpot) break;
                }
            }

            // 애니메이션
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

            // 데이터 갱신
            cluster.forEach(i => { state.grid[i] = null; });
            
            if (nextChar) {
                state.grid[targetIdx] = nextChar;
                nextGroup.set(targetIdx, nextChar);
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                }
            } else {
                scoreGained += 1000; // Z 넘어가면 보너스
            }
            
            AudioMgr.play('merge'); // 소리
        }
    }

    if (scoreGained > 0) {
        addScore(scoreGained);
        UI.renderGrid();
        UI.updateUI();
    }
    
    if (merged && nextGroup.size > 0) {
        await wait(200);
        await handleMerge(Array.from(nextGroup.keys()));
    } else {
        await checkAutoUpgrade();
    }
}

// [3] 자동 승급 (기존 로직 유지 - 건드리지 않음)
async function checkAutoUpgrade() {
    const minIdx = Core.getMinIdx();
    let upgraded = false;
    let upgradeIndices = [];

    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        // 최소 레벨보다 낮으면 승급
        if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
            state.grid[i] = ALPHABET[minIdx];
            upgraded = true;
            upgradeIndices.push(i);
        }
    }
    
    if(upgraded) { 
        UI.renderGrid(); 
        await wait(300); 
        await handleMerge(upgradeIndices); 
    }
}

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

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
