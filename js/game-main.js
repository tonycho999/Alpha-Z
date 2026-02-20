import { state, ALPHABET, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    state.diff = params.get('diff') || 'NORMAL';
    document.getElementById('ui-diff').textContent = state.diff;
    
    initGridSize(state.diff);
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for(let i=0; i<state.gridSize*state.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'cell'; div.id = `cell-${i}`;
        div.onclick = () => handleCellClick(i);
        container.appendChild(div);
    }

    state.nextBlock = Core.createRandomBlock();
    nextTurn();
    UI.updateUI();

    document.getElementById('btn-check-save').onclick = async () => {
        const name = document.getElementById('username-input').value.trim();
        if(!name) return alert('Enter username!');
        checkAdmin(name);
        
        const res = await Core.saveScoreToDB(name);
        if(res.success) {
            document.getElementById('area-new-user').style.display='none';
            document.getElementById('save-msg').style.display='block';
            UI.updateUI();
        } else alert(res.msg);
    };

    document.getElementById('btn-just-save').onclick = () => {
        Core.saveScoreToDB(localStorage.getItem('alpha_username'));
        document.getElementById('area-exist-user').style.display='none';
        document.getElementById('save-msg').style.display='block';
    };
};

function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); UI.updateUI();
    }
}

function nextTurn() {
    state.currentBlock = state.nextBlock;
    state.nextBlock = Core.createRandomBlock();
    
    setTimeout(() => {
        UI.renderSource(state.currentBlock, 'source-block');
        UI.renderSource(state.nextBlock, 'next-preview');
        UI.setupDrag(handleDropAttempt);
    }, 50);

    // 게임 오버 체크
    if(!Core.canPlaceAnywhere(state.currentBlock)) {
        document.getElementById('popup-over').style.display = 'flex';
        document.getElementById('over-best').textContent = state.best;
        
        // 이미 부활을 썼다면 버튼 숨기기
        const reviveBtn = document.getElementById('btn-revive-ad');
        if(state.hasRevived) {
            reviveBtn.style.display = 'none';
        } else {
            reviveBtn.style.display = 'flex'; 
        }

        const name = localStorage.getItem('alpha_username');
        document.getElementById(name ? 'area-exist-user' : 'area-new-user').style.display = 'block';
        if(name) document.getElementById('user-badge').textContent = name;
    }
}

// [수정됨] 덮어쓰기 로직 제거 -> 일반적인 빈칸 찾기 로직으로 복귀
function handleDropAttempt(targetIdx, isPreview) {
    const size = state.gridSize;
    const r = Math.floor(targetIdx / size), c = targetIdx % size;
    const shape = state.currentBlock.shape;
    let finalIndices = null;

    // 일반적인 배치 로직 (빈칸인지 확인)
    for (let i = 0; i < shape.map.length; i++) {
        const anchorR = r - shape.map[i][0], anchorC = c - shape.map[i][1];
        let possible = true, temp = [];
        for (let j = 0; j < shape.map.length; j++) {
            const tr = anchorR + shape.map[j][0], tc = anchorC + shape.map[j][1];
            const tidx = tr * size + tc;
            
            // 경계 밖이거나, 이미 블록이 있으면 배치 불가
            if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx] !== null) { 
                possible = false; 
                break; 
            }
            temp.push(tidx);
        }
        if (possible) { finalIndices = temp; break; }
    }

    if(!finalIndices) return false;

    if(isPreview) {
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            el.classList.add('highlight-valid');
            // 부활 턴일 때 시각적 강조
            if(state.isReviveTurn) el.style.borderColor = '#4CAF50'; // 초록색 (안전함)
        });
        return true;
    } else {
        placeBlock(finalIndices);
        return true;
    }
}

async function placeBlock(indices) {
    state.isLocked = true;
    
    // 부활 턴 종료
    if(state.isReviveTurn) {
        state.isReviveTurn = false;
        document.getElementById('popup-over').style.display = 'none';
    }

    indices.forEach((pos, i) => state.grid[pos] = state.currentBlock.items[i]);
    UI.renderGrid();
    await wait(300);

    let checkAgain = true;
    while(checkAgain) {
        checkAgain = false;
        
        let merged = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cluster = Core.getCluster(i);
                if(cluster.length >= 2) {
                    await processMerge(i, cluster);
                    merged = true; break; 
                }
            }
        }
        if(merged) { checkAgain = true; continue; }

        const minIdx = Core.getMinIdx();
        let upgraded = false;
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                state.grid[i] = ALPHABET[minIdx];
                upgraded = true;
                const cell = document.getElementById(`cell-${i}`);
                if(cell) { cell.classList.add('merging-source'); setTimeout(()=>cell.classList.remove('merging-source'),300); }
            }
        }
        if(upgraded) { UI.renderGrid(); await wait(300); checkAgain = true; }
    }
    
    state.isLocked = false;
    nextTurn();
}

async function processMerge(idx, cluster) {
    const char = state.grid[idx];
    const nextIdx = ALPHABET.indexOf(char) + (cluster.length - 1);
    const next = ALPHABET[nextIdx] || char;

    const centerEl = document.getElementById(`cell-${idx}`);
    for(let t of cluster) {
        if(t===idx) continue;
        const el = document.getElementById(`cell-${t}`);
        if(el) {
            el.classList.add('merging-source');
            el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
            el.style.opacity = '0';
        }
    }
    await wait(400);

    state.grid[idx] = next;
    cluster.forEach(n => { if(n !== idx) state.grid[n] = null; });
    
    if(nextIdx > ALPHABET.indexOf(state.best)) state.best = next;
    
    if(nextIdx >= ALPHABET.indexOf('O')) {
        if(!state.isAdmin) {
            state.stars++; localStorage.setItem('alpha_stars', state.stars);
        }
        if(next === 'O' && !state.hasReachedO) {
            state.hasReachedO = true;
            if(!state.isAdmin) {
                alert("🎉 Congratulations! You reached 'O'! \nA sponsor ad will open to support us. (+1 Star)");
                window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            }
        }
    }
    
    UI.renderGrid(); UI.updateUI(); await wait(200);
}

// 아이템 전역 로직
window.gameLogic = {
    useHammer: () => {
        const cost = 2;
        if(state.stars < cost && !state.isAdmin) {
            triggerAdForItem(cost, () => {
                state.isHammerMode = !state.isHammerMode;
                document.getElementById('grid-container').classList.toggle('hammer-mode');
            });
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); UI.updateUI(); }
        state.isHammerMode = !state.isHammerMode;
        document.getElementById('grid-container').classList.toggle('hammer-mode');
    },
    useRefresh: () => {
        const cost = 1;
        if(state.stars < cost && !state.isAdmin) {
            triggerAdForItem(cost, () => {
                UI.updateUI(); nextTurn();
            });
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); }
        UI.updateUI(); nextTurn();
    },
    useUpgrade: () => {
        const cost = 5;
        if(state.stars < cost && !state.isAdmin) {
            if (state.stars + 2 >= cost) {
                triggerAdForItem(cost, () => { executeUpgrade(); });
            } else {
                alert(`Need ${cost} Stars! You only have ${state.stars}⭐.\nVisit the shop to earn more!`);
            }
            return;
        }
        if(!state.isAdmin) { state.stars -= cost; localStorage.setItem('alpha_stars', state.stars); UI.updateUI(); }
        executeUpgrade();
    },
    // 광고 보고 만능 블록(1x1) 얻기
    tryReviveWithAd: () => {
        if(state.hasRevived) return; 

        if(state.isAdmin) { doReviveAction(); return; }

        if(confirm("Watch ad to get a 1x1 'A' Block? \nIt fits in any empty space!")) {
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            
            setTimeout(() => {
                AdManager.recordAdWatch();
                doReviveAction();
                alert("You got a 1x1 Block! Place it in an empty spot.");
            }, 3000);
        }
    }
};

// [수정됨] 부활 실행: 1x1 'A' 지급 + (중요) 빈칸 없으면 하나 만들어주기
function doReviveAction() {
    state.hasRevived = true;
    state.isReviveTurn = true; 

    // 1. 현재 블록을 1x1 'A'로 교체
    state.currentBlock = {
        shape: { w:1, h:1, map:[[0,0]] },
        items: ['A'] 
    };

    // 2. [안전장치] 만약 보드가 100% 꽉 찼다면, 1x1 블록도 못 놓는다.
    // 따라서 가장 등급이 낮은 블록 1개를 찾아서 지워준다.
    const hasEmptySpace = state.grid.includes(null);
    if (!hasEmptySpace) {
        let lowestIdx = -1;
        let lowestCharIdx = 999;
        
        // 가장 낮은 알파벳 찾기
        for(let i=0; i<state.gridSize*state.gridSize; i++) {
            if(state.grid[i]) {
                const cIdx = ALPHABET.indexOf(state.grid[i]);
                if(cIdx < lowestCharIdx) {
                    lowestCharIdx = cIdx;
                    lowestIdx = i;
                }
            }
        }

        // 지우기
        if(lowestIdx !== -1) {
            state.grid[lowestIdx] = null;
            UI.renderGrid(); // 화면 갱신
            // 알림
            setTimeout(() => alert("Board was full! \nOne lowest block removed to make space."), 100);
        }
    }

    // UI 갱신
    UI.renderSource(state.currentBlock, 'source-block');
    document.getElementById('popup-over').style.display = 'none';
}

function triggerAdForItem(cost, actionCallback) {
    const adStatus = AdManager.canWatchAd();
    if (!adStatus.canWatch) {
        if (adStatus.reason === 'cooldown') {
            const min = Math.ceil(adStatus.remaining / 60000);
            alert(`Ad is cooling down. Try again in ${min} min.`);
        } else {
            alert(adStatus.reason);
        }
        return;
    }

    if(confirm("Not enough stars! Watch an ad to get 2 Stars and use item?")) {
        window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
        
        setTimeout(() => {
            AdManager.recordAdWatch();
            state.stars += 2;
            state.stars -= cost;
            localStorage.setItem('alpha_stars', state.stars);
            actionCallback(); 
            alert("Thanks for watching! Item applied.");
        }, 2000);
    }
}

async function executeUpgrade() {
    if (state.isLocked || state.isHammerMode) return;
    state.isLocked = true;
    
    let lowestIdx = 999;
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        if (state.grid[i]) {
            const charIdx = ALPHABET.indexOf(state.grid[i]);
            if (charIdx < lowestIdx) lowestIdx = charIdx;
        }
    }

    if (lowestIdx === 999) { state.isLocked = false; return; }

    const lowestChar = ALPHABET[lowestIdx];
    const nextChar = ALPHABET[lowestIdx + 1] || lowestChar;

    let upgraded = false;
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        if (state.grid[i] === lowestChar) {
            state.grid[i] = nextChar;
            upgraded = true;
            const cell = document.getElementById(`cell-${i}`);
            if (cell) {
                cell.classList.add('merging-source');
                setTimeout(() => cell.classList.remove('merging-source'), 300);
            }
        }
    }

    if (upgraded) {
        UI.renderGrid();
        await wait(300);
        
        let checkAgain = true;
        while(checkAgain) {
            checkAgain = false;
            let merged = false;
            for(let i=0; i<state.gridSize*state.gridSize; i++) {
                if(state.grid[i]) {
                    const cluster = Core.getCluster(i);
                    if(cluster.length >= 2) {
                        await processMerge(i, cluster);
                        merged = true; break; 
                    }
                }
            }
            if(merged) { checkAgain = true; continue; }

            const minIdx = Core.getMinIdx();
            let autoUpgraded = false;
            for(let i=0; i<state.gridSize*state.gridSize; i++) {
                if(state.grid[i] && ALPHABET.indexOf(state.grid[i]) < minIdx) {
                    state.grid[i] = ALPHABET[minIdx];
                    autoUpgraded = true;
                    const cell = document.getElementById(`cell-${i}`);
                    if(cell) { cell.classList.add('merging-source'); setTimeout(()=>cell.classList.remove('merging-source'),300); }
                }
            }
            if(autoUpgraded) { UI.renderGrid(); await wait(300); checkAgain = true; }
        }
    }
    state.isLocked = false;
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
