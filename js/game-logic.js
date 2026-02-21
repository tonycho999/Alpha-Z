import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// [저장] currentMax 포함하여 상태 완벽 저장
export function saveGameState() {
    const saveData = {
        grid: state.grid,
        hand: state.hand,
        score: state.score,
        best: state.best,
        currentMax: state.currentMax, // 중요: A블록 보장을 위해 필수
        items: state.items,
        stars: state.stars,
        diff: state.diff
    };
    localStorage.setItem('alpha_gamestate', JSON.stringify(saveData));
    
    // 개별 값들도 백업 저장
    localStorage.setItem('alpha_score', state.score);
    localStorage.setItem('alpha_best', state.best);
    localStorage.setItem('alpha_stars', state.stars);
    localStorage.setItem('alpha_items', JSON.stringify(state.items));
}

export async function placeBlock(indices, block, onComplete) {
    if(state.isLocked) return;
    state.isLocked = true;
    try {
        AudioMgr.play('drop');
        indices.forEach((pos, i) => state.grid[pos] = block.items[i]);
        
        // 사용한 핸드 비우기
        state.hand[state.dragIndex] = null;
        state.dragIndex = -1; 
        
        UI.renderGrid(); 
        UI.renderHand(); 
        
        await wait(200);
        await handleMerge(indices); 
        
        saveGameState(); // 턴 종료 저장

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
                // 합쳐질 중심점 찾기
                for (let cIdx of cluster) {
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                         if (n>=0 && n<state.grid.length && !cluster.includes(n) && state.grid[n] === nextChar) {
                             targetIdx = cIdx; break;
                         }
                    }
                }
                
                // [중요] 현재 판 최고 기록 갱신 (블록 생성 레벨 조절용)
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.currentMax)) {
                    state.currentMax = nextChar;
                }
                // 역대 최고 기록 갱신
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                    localStorage.setItem('alpha_best', state.best);
                }
            } else {
                scoreGained += 1000; // Z 이후 보너스
            }
            
            // 병합 애니메이션
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
    
    // 연쇄 반응 체크
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

// [점수 & 스타 획득 로직 수정 - 10000점 시작, 5000점 추가]
function addScore(amount) {
    state.score += amount;

    // 이미 받은 스타 개수 로드
    if (typeof state.earnedStars === 'undefined') {
        state.earnedStars = parseInt(localStorage.getItem('alpha_earned_stars')) || 0;
    }

    let calculatedStars = 0;
    if (state.score >= 10000) {
        // 기본 1개 (10000점)
        calculatedStars = 1;
        // 추가 (매 5000점 마다)
        const extraScore = state.score - 10000;
        calculatedStars += Math.floor(extraScore / 5000);
    }

    // 받아야 할 스타가 더 많으면 차이만큼 지급
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

// [아이템 구매]
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
