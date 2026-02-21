import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// [수정] 난이도별 BEST 저장
export function saveGameState() {
    const saveData = {
        grid: state.grid,
        hand: state.hand,
        score: state.score,
        best: state.best,
        currentMax: state.currentMax, 
        items: state.items,
        stars: state.stars,
        diff: state.diff
    };
    localStorage.setItem('alpha_gamestate', JSON.stringify(saveData));
    
    // 개별 값 저장
    localStorage.setItem('alpha_score', state.score);
    // [중요] 난이도별로 베스트 분리 저장 (예: alpha_best_HELL)
    localStorage.setItem(`alpha_best_${state.diff}`, state.best);
    localStorage.setItem('alpha_stars', state.stars);
    localStorage.setItem('alpha_items', JSON.stringify(state.items));
}

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
        
        saveGameState(); 

    } catch (e) { console.error(e); } 
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
                
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.currentMax)) {
                    state.currentMax = nextChar;
                }
                
                // [수정] 난이도별 베스트 기록 갱신
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                    // 즉시 로컬스토리지에도 모드별 키로 저장
                    localStorage.setItem(`alpha_best_${state.diff}`, state.best);
                }
            } else { scoreGained += 1000; }
            
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
            }
            AudioMgr.play('merge'); 
        }
    }
    
    if (scoreGained > 0) {
        addScore(scoreGained);
        UI.renderGrid(); UI.updateUI();
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
    if (typeof state.earnedStars === 'undefined') {
        state.earnedStars = parseInt(localStorage.getItem('alpha_earned_stars')) || 0;
    }

    let calculatedStars = 0;
    if (state.score >= 10000) {
        calculatedStars = 1;
        const extraScore = state.score - 10000;
        calculatedStars += Math.floor(extraScore / 5000);
    }

    if (calculatedStars > state.earnedStars) {
        const starsToAdd = calculatedStars - state.earnedStars;
        if (starsToAdd > 0) {
            state.stars += starsToAdd;
            state.earnedStars = calculatedStars;
            localStorage.setItem('alpha_stars', state.stars);
            localStorage.setItem('alpha_earned_stars', state.earnedStars);
        }
    }
    UI.updateUI();
}

export function buyItem(itemType, price) {
    if (state.stars >= price) {
        state.stars -= price;
        if (!state.items) state.items = { refresh: 0, hammer: 0, upgrade: 0 };
        state.items[itemType] = (state.items[itemType] || 0) + 1;
        
        localStorage.setItem('alpha_stars', state.stars);
        localStorage.setItem('alpha_items', JSON.stringify(state.items));
        UI.updateUI(); 
        AudioMgr.play('merge');
        return true;
    } else {
        alert("Not enough stars!");
        return false;
    }
}

export function useRefresh(onRefill) {
    if(state.items.refresh > 0) {
        state.items.refresh--; saveGameState();
        onRefill(); UI.updateUI();
    } else alert("No Refresh item!");
}

export function useHammer() {
    if(state.items.hammer > 0) {
        state.items.hammer--; saveGameState();
        state.isHammerMode = true;
        document.getElementById('grid-container').classList.add('hammer-mode');
        alert("Click a block to remove!"); UI.updateUI();
    } else alert("No Hammer item!");
}

export function useUpgrade() {
    if(state.items.upgrade > 0) {
        state.items.upgrade--; saveGameState();
        let upgraded = false;
        state.grid.forEach((char, i) => {
            if(char) {
                state.grid[i] = ALPHABET[ALPHABET.indexOf(char)+1] || char;
                upgraded = true;
            }
        });
        if(upgraded) { UI.renderGrid(); AudioMgr.play('merge'); }
        UI.updateUI();
    } else alert("No Upgrade item!");
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
