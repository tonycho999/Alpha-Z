import { state, ALPHABET } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// ... (placeBlock, handleMerge, checkAutoUpgrade, addScore 등 기존 로직 유지) ...
// (기존 코드 생략 없이 사용)

// [1] 블록 배치 실행
export async function placeBlock(indices, block, onComplete) {
    if(state.isLocked) return;
    state.isLocked = true;
    try {
        AudioMgr.play('drop');
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        state.hand[state.dragIndex] = null;
        state.dragIndex = -1; 
        UI.renderGrid();
        UI.renderHand(); 
        await wait(200);
        await handleMerge(indices);
    } catch (e) { console.error("Error:", e); } 
    finally { state.isLocked = false; if(onComplete) onComplete(); }
}

async function handleMerge(indices) {
    let merged = false;
    const nextGroup = new Map();
    let scoreGained = 0;
    const uniqueIndices = [...new Set(indices)];

    for (let idx of uniqueIndices) {
        if (!state.grid[idx]) continue;
        const cluster = Core.getCluster(idx);
        // A+A=B (2개 이상 합체)
        if (cluster.length >= 2) { 
            merged = true;
            const char = state.grid[idx];
            const bonus = cluster.length - 1; 
            const nextIdxVal = ALPHABET.indexOf(char) + bonus;
            const nextChar = ALPHABET[nextIdxVal];
            scoreGained += (10 * cluster.length * bonus); 
            
            let targetIdx = idx;
            if (nextChar) {
                for (let cIdx of cluster) {
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                         if (n>=0 && n<state.grid.length && !cluster.includes(n) && state.grid[n] === nextChar) {
                             targetIdx = cIdx; break;
                         }
                    }
                }
            }
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
            cluster.forEach(i => { state.grid[i] = null; });
            if (nextChar) {
                state.grid[targetIdx] = nextChar;
                nextGroup.set(targetIdx, nextChar);
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) state.best = nextChar;
            } else {
                scoreGained += 1000; 
            }
            AudioMgr.play('merge'); 
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

async function checkAutoUpgrade() {
    const minIdx = Core.getMinIdx();
    let upgraded = false;
    let upgradeIndices = [];
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
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
    // 점수 오르면 UI 갱신 필수
    UI.updateUI();
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// [추가] 아이템 구매 로직
export function buyItem(itemType, price) {
    if (state.stars >= price) {
        state.stars -= price;
        // items 객체가 없으면 초기화
        if (!state.items) state.items = { refresh: 0, hammer: 0, upgrade: 0 };
        
        state.items[itemType] = (state.items[itemType] || 0) + 1;
        
        // 저장
        localStorage.setItem('alpha_stars', state.stars);
        localStorage.setItem('alpha_items', JSON.stringify(state.items));
        
        // UI 갱신
        UI.updateUI();
        AudioMgr.play('merge'); // 성공음
        return true;
    } else {
        alert("Not enough stars!");
        return false;
    }
}
