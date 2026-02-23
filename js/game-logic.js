import { state, ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js"; 
import { AudioMgr } from "./game-audio.js";
import { db } from "./firebase-config.js";

// [저장] 게임 상태 로컬스토리지 저장
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
    localStorage.setItem(`alpha_best_${state.diff}`, state.best);
    localStorage.setItem('alpha_stars', state.stars);
    localStorage.setItem('alpha_items', JSON.stringify(state.items));
}
export function handleCellClick(idx) {
    // 망치 모드가 켜져있을 때만 작동
    if (state.isHammerMode) {
        
        // 1. 빈 칸이 아닌지 확인 (블록이 있어야 부술 수 있음)
        if (state.grid[idx]) {
            
            // 2. 블록 삭제
            state.grid[idx] = null;
            
            // 3. 망치 모드 종료 및 스타일 제거
            state.isHammerMode = false;
            const gridContainer = document.getElementById('grid-container');
            if(gridContainer) gridContainer.classList.remove('hammer-mode');
            
            // [핵심] 🔊 소리 재생! (기존 drop 소리를 재활용)
            // 더 강력한 소리를 원하시면 HTML에 <audio id="s-break">를 추가하고 'break'로 바꾸세요.
            AudioMgr.play('drop'); 
            
            // 4. 저장 및 화면 갱신
            saveGameState();
            UI.renderGrid();
            UI.updateUI();
            
        } else {
            // 빈 칸을 눌렀을 때
            alert("Select a block to remove!");
        }
    }
}
// [블록 배치]
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

// [머지 로직]
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
                // 합쳐질 위치 결정 (가능하면 다음 단계 블록 근처로)
                for (let cIdx of cluster) {
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                         if (n>=0 && n<state.grid.length && !cluster.includes(n) && state.grid[n] === nextChar) {
                             targetIdx = cIdx; break;
                         }
                    }
                }
                
                // 현재 게임 최고 기록 갱신
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.currentMax)) {
                    state.currentMax = nextChar;
                }
                
                // 역대 최고 기록 갱신
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                    localStorage.setItem(`alpha_best_${state.diff}`, state.best);
                }
            } else { scoreGained += 1000; } // Z 이상은 점수 보너스
            
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
    
    // 연쇄 머지 또는 자동 업그레이드 체크
    if (merged && nextGroup.size > 0) {
        await wait(200);
        await handleMerge(Array.from(nextGroup.keys()));
    } else {
        await checkAutoUpgrade();
    }
}

// [자동 업그레이드 체크] (판에 너무 낮은 블록이 혼자 남았을 때)
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

// [점수 및 스타 추가]
export function addScore(amount) {
    const oldScore = state.score;
    state.score += amount;

    // 스타 계산: 5000점 달성 시 1개, 이후 1000점마다 1개
    const calcStars = (score) => {
        if (score < 5000) return 0;
        return 1 + Math.floor((score - 5000) / 1000);
    };

    const oldStarsEarned = calcStars(oldScore);
    const newStarsEarned = calcStars(state.score);
    const earned = newStarsEarned - oldStarsEarned;

    if (earned > 0) {
        state.stars += earned;
        const starEl = document.getElementById('ui-stars');
        if(starEl) {
            starEl.style.transform = 'scale(1.5)';
            setTimeout(() => starEl.style.transform = 'scale(1)', 300);
        }
    }

    // 점수 갱신 시 최고 기록도 한 번 더 체크
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    const bestIdx = ALPHABET.indexOf(state.best);
    if (currentIdx > bestIdx) {
        state.best = state.currentMax;
        localStorage.setItem(`alpha_best_${state.diff}`, state.best);
    }

    UI.updateUI();
    saveGameState();
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

// [아이템 사용: 새로고침]
export function useRefresh(onRefill) {
    if(state.items.refresh > 0) {
        state.items.refresh--; 
        saveGameState();
        onRefill(); 
        UI.updateUI();
    } else alert("No Refresh item!");
}

// [아이템 사용: 망치]
export function useHammer() {
    if(state.items.hammer > 0) {
        state.items.hammer--; 
        saveGameState();
        state.isHammerMode = true;
        document.getElementById('grid-container').classList.add('hammer-mode');
        alert("Click a block to remove!"); 
        UI.updateUI();
    } else alert("No Hammer item!");
}

// [아이템 사용: 업그레이드 (수정됨)]
export async function useUpgrade() {
    if (state.items.upgrade > 0) {
        
        let minIdx = 999;
        let hasBlock = false;

        // 1. 최저 레벨 찾기
        state.grid.forEach(char => {
            if (char) {
                const idx = ALPHABET.indexOf(char);
                if (idx < minIdx) {
                    minIdx = idx;
                    hasBlock = true;
                }
            }
        });

        if (!hasBlock) {
            alert("No blocks to upgrade!");
            return;
        }

        // 2. 아이템 소모
        state.items.upgrade--; 
        saveGameState();

        let upgradedIndices = [];

        // 3. 최저 레벨 블록들만 업그레이드
        state.grid.forEach((char, i) => {
            if (char) {
                const currentIdx = ALPHABET.indexOf(char);
                if (currentIdx === minIdx) {
                    const nextChar = ALPHABET[currentIdx + 1];
                    if (nextChar) {
                        state.grid[i] = nextChar;
                        upgradedIndices.push(i); // 변경된 위치 저장
                    }
                }
            }
        });

        // 4. 반영 및 자동 머지 실행
        if (upgradedIndices.length > 0) {
            UI.renderGrid();
            AudioMgr.play('merge');
            
            // [핵심] 업그레이드된 블록들에 대해 머지 체크
            await wait(200);
            await handleMerge(upgradedIndices);
        }
        
        UI.updateUI();

    } else {
        alert("No Upgrade item!");
    }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
