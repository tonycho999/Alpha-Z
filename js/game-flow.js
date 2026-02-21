import { state, ALPHABET, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import { AudioMgr } from "./game-audio.js";

// 셀 클릭 처리 (망치 모드 등)
export function handleCellClick(idx) {
    if(state.isHammerMode && state.grid[idx]) {
        state.grid[idx] = null;
        state.isHammerMode = false;
        document.getElementById('grid-container').classList.remove('hammer-mode');
        UI.renderGrid(); 
        UI.updateUI();
        
        // 망치 사용 후 핸드 리필 체크 (혹시 비었을 수 있으므로)
        checkHandAndRefill();
    }
}

// 핸드 확인 및 리필
export function checkHandAndRefill() {
    // 핸드에 남은 블록이 없으면(모두 null) 리필
    const isEmpty = state.hand.every(b => b === null);
    
    if (isEmpty) {
        state.hand = [
            Core.createRandomBlock(),
            Core.createRandomBlock(),
            Core.createRandomBlock()
        ];
        UI.renderHand();
        UI.setupDrag(handleDropAttempt); // 드래그 이벤트 다시 연결
        checkGameOver();
    } else {
        checkGameOver();
    }
}

// 게임 오버 체크
function checkGameOver() {
    let canPlace = false;
    
    // 핸드에 있는 블록 중 하나라도 놓을 곳이 있는지 확인
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
        const popup = document.getElementById('popup-over');
        if(popup) popup.style.display = 'flex';
        
        const overBest = document.getElementById('over-best');
        if(overBest) overBest.textContent = state.best;
        
        // [광고 보고 부활하기 버튼 연결]
        const btnRevive = document.getElementById('btn-revive-ad');
        if(btnRevive) {
            if(state.hasRevived) {
                btnRevive.style.display = 'none'; // 이미 부활했으면 숨김
            } else {
                btnRevive.style.display = 'block';
                btnRevive.onclick = () => {
                    // AdManager를 통해 광고 시청 시도
                    AdManager.showRewardAd(() => {
                        // 광고 시청 성공 시 실행되는 콜백
                        state.hasRevived = true;
                        state.isReviveTurn = true;
                        
                        // 중앙 3x3 비우기 (부활 보상)
                        const center = Math.floor(state.gridSize/2);
                        for(let r=center-1; r<=center+1; r++){
                            for(let c=center-1; c<=center+1; c++){
                                const idx = r*state.gridSize+c;
                                if(idx >= 0 && idx < state.grid.length) {
                                    state.grid[idx] = null;
                                }
                            }
                        }
                        if(popup) popup.style.display = 'none';
                        UI.renderGrid();
                        // 부활 후 다시 게임 진행 가능 여부 체크 및 UI 갱신
                        checkHandAndRefill();
                    });
                };
            }
        }

        // 유저 이름/저장 UI 표시
        const name = localStorage.getItem('alpha_username');
        const existArea = document.getElementById('area-exist-user');
        const newArea = document.getElementById('area-new-user');
        
        if(name) {
             if(existArea) {
                 existArea.style.display = 'block';
                 const badge = document.getElementById('user-badge');
                 if(badge) badge.textContent = name;
             }
             if(newArea) newArea.style.display = 'none';
        } else {
             if(existArea) existArea.style.display = 'none';
             if(newArea) newArea.style.display = 'block';
        }
    }
}

export function nextTurn() {
    checkHandAndRefill();
}

// 드롭 시도 처리 (UI에서 호출)
export function handleDropAttempt(targetIdx, isPreview) {
    if(state.dragIndex === -1) return false;
    const block = state.hand[state.dragIndex];
    if (!block) return false;

    const size = state.gridSize;
    const r = Math.floor(targetIdx / size);
    const c = targetIdx % size;
    const shape = block.shape;
    let finalIndices = null;

    // 배치 가능 여부 확인 (블록의 기준점(0,0)을 targetIdx에 맞춤 - 이전 로직 유지)
    // *주의: UI에서 자석 기능으로 보정된 targetIdx가 넘어옵니다.
    // 하지만 shape 정의에 따라 블록이 차지하는 칸들이 유효한지 다시 확인해야 합니다.
    
    // 블록의 모양을 순회하며 배치 가능 여부 및 실제 놓일 인덱스 계산
    // (game-ui.js의 getMagnetGridIndex는 '놓을 기준점'을 찾아줍니다)
    // 여기서 기준점은 shape의 (0,0) 좌표에 해당하는 그리드 인덱스라고 가정합니다.
    // 하지만 SHAPES 정의상 (0,0)이 포함되어 있으므로, 
    // targetIdx를 기준으로 shape의 상대 좌표를 더해 검사하면 됩니다.
    
    // * UI 드래그에서 넘어온 targetIdx는 블록의 (0,0) 위치가 놓일 그리드 인덱스입니다.
    
    let possible = true;
    let tempIndices = [];
    
    for (let i = 0; i < shape.map.length; i++) {
        const tr = r + shape.map[i][0];
        const tc = c + shape.map[i][1];
        const tidx = tr * size + tc;

        // 그리드 범위 밖이거나 이미 블록이 있으면 불가능
        if (tr < 0 || tr >= size || tc < 0 || tc >= size || state.grid[tidx]) { 
            possible = false; 
            break; 
        }
        tempIndices.push(tidx);
    }

    if (!possible) return false;
    finalIndices = tempIndices;

    if(isPreview) {
        // 미리보기 하이라이트
        finalIndices.forEach(i => {
            const el = document.getElementById(`cell-${i}`);
            if(el) el.classList.add('highlight-valid');
        });
        return true;
    } else {
        // 실제 배치
        placeBlock(finalIndices, block);
        return true;
    }
}

// 블록 배치 실행
async function placeBlock(indices, block) {
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
        checkHandAndRefill();
    }
}

// [핵심] 재귀적 합체 로직 (점수 + 스마트 위치 선정)
async function handleMerge(indices) {
    let merged = false;
    const nextGroup = new Map(); // 중복 방지용 (idx -> char)
    let scoreGained = 0; // 이번 턴 점수
    
    // indices: 이번에 새로 놓이거나 합쳐져서 생긴 블록들의 위치
    // 이 위치들을 중심으로 병합이 일어날지 체크합니다.
    
    // 중복 체크 방지 (한 번의 배치로 여러 칸이 변할 수 있음)
    const uniqueIndices = [...new Set(indices)];

    for (let idx of uniqueIndices) {
        // 이미 처리되어(병합되어) 사라진 칸이면 패스
        if (!state.grid[idx]) continue;

        const cluster = Core.getCluster(idx);
        if (cluster.length >= 3) {
            merged = true;
            const char = state.grid[idx];
            // 다음 문자 (A -> B)
            const nextIdxVal = ALPHABET.indexOf(char) + 1;
            const nextChar = ALPHABET[nextIdxVal];

            // [점수] 기본 10점 * 개수
            scoreGained += (10 * cluster.length);
            
            // 3. [스마트 머지] 결과물이 생성될 최적의 위치 찾기
            // 합쳐지는 블록들(cluster) 중에서, '다음 단계(nextChar)'와 또 합쳐질 수 있는 위치를 찾음
            let targetIdx = idx; // 기본값 (현재 위치)
            let foundSmartSpot = false;

            if (nextChar) {
                for (let cIdx of cluster) {
                    // cIdx 주변에 nextChar가 있는지 검사
                    const neighbors = [cIdx-1, cIdx+1, cIdx-state.gridSize, cIdx+state.gridSize];
                    for (let n of neighbors) {
                        if (n >= 0 && n < state.grid.length && 
                            !cluster.includes(n) && // 자기 자신들(cluster) 제외
                            state.grid[n] === nextChar) { // 주변에 다음 단계 블록이 있다면
                            
                            targetIdx = cIdx; // 그 옆이 명당이다!
                            foundSmartSpot = true;
                            break;
                        }
                    }
                    if(foundSmartSpot) break;
                }
            }
            
            // 병합 연출 (중심점으로 모이는 애니메이션)
            const centerEl = document.getElementById(`cell-${targetIdx}`);
            for(let t of cluster) {
                if(t === targetIdx) continue;
                const el = document.getElementById(`cell-${t}`);
                if(el && centerEl) {
                    el.classList.add('merging-source');
                    // 중심점으로 이동하는 연출
                    el.style.transform = `translate(${centerEl.offsetLeft - el.offsetLeft}px, ${centerEl.offsetTop - el.offsetTop}px)`;
                    el.style.opacity = '0';
                }
            }
            await wait(300); // 연출 대기

            // 데이터 업데이트: 클러스터 삭제
            cluster.forEach(i => {
                state.grid[i] = null;
            });

            // 결과물 생성 (Z가 아니면)
            if (nextChar) {
                state.grid[targetIdx] = nextChar;
                nextGroup.set(targetIdx, nextChar); // 다음 단계 머지 후보 등록
                
                // 최고 기록 갱신
                if (ALPHABET.indexOf(nextChar) > ALPHABET.indexOf(state.best)) {
                    state.best = nextChar;
                }
            } else {
                // Z를 터뜨림 (보너스 점수)
                scoreGained += 500;
            }

            // 효과음
            AudioMgr.play('merge');
        }
    }

    // [점수 반영]
    if (scoreGained > 0) {
        addScore(scoreGained);
        UI.renderGrid();
        UI.updateUI();
    }
    
    // 자동 승급 체크 (최소 레벨보다 낮은 블록 자동 업그레이드)
    // 병합이 일어나지 않았더라도 실행되어야 할 수 있으므로 로직 확인 필요
    // 여기서는 병합 과정의 일부로 봅니다.
    
    // 연쇄 반응이 있으면 재귀 호출
    if (merged && nextGroup.size > 0) {
        await wait(150);
        await handleMerge(Array.from(nextGroup.keys()));
    } else {
        // 병합이 끝난 후, 최소 레벨 미만 블록 승급 체크
        await checkAutoUpgrade();
    }
}

// 자동 승급 (Min Index 보다 낮은 블록 제거/승급)
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
        refreshRemainingHand(); // 핸드도 갱신
        UI.renderGrid(); 
        await wait(300); 
        // 승급된 블록들로 인해 또 합쳐질 수 있으므로 체크
        await handleMerge(upgradeIndices); 
    }
}

// 점수 추가 및 스타 지급 로직
function addScore(amount) {
    state.score += amount;
    
    // 1000점마다 별 1개 지급
    // (누적 점수를 기반으로 계산)
    // state.earnedStars는 이번 세션에서 점수로 얻은 별의 개수를 추적하기 위한 변수입니다.
    // 만약 없다면 초기화
    if (typeof state.earnedStars === 'undefined') state.earnedStars = 0;

    const neededScore = state.earnedStars * 1000 + 1000;
    if (state.score >= neededScore) {
        const starsToAdd = Math.floor((state.score - state.earnedStars * 1000) / 1000);
        if (starsToAdd > 0) {
            state.stars += starsToAdd;
            state.earnedStars += starsToAdd; 
            
            // 로컬 스토리지 저장
            localStorage.setItem('alpha_stars', state.stars); 
        }
    }
    
    // 점수는 화면 UI에 반영 (updateUI에서 처리됨)
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
        AudioMgr.play('merge'); // 사운드 재활용
    }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
