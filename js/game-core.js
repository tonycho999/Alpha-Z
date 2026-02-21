import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [1. 난이도별 블록 삭제 규칙 & 한계점 적용]
export function getMinIdx() {
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    let limitIdx = 0;

    // 난이도별 삭제 한계점(Limit) 설정
    switch(state.diff) {
        case 'EASY':
            limitIdx = 21; // V (V 이후로는 A가 삭제되지 않음)
            break;
        case 'NORMAL':
        case 'HARD':
            limitIdx = 19; // T (T 이후로는 삭제 멈춤)
            break;
        case 'HELL':
            limitIdx = 17; // R (R 이후로는 삭제 멈춤)
            break;
        default:
            limitIdx = 19;
    }

    // 현재 단계와 한계점 중 낮은 것 선택
    const effectiveIdx = Math.min(currentIdx, limitIdx);

    // 삭제 공식 적용: (단계 - 3) / 2
    return Math.max(0, Math.floor((effectiveIdx - 3) / 2));
}

// [2. 난이도별 블록 출현 확률 (요청하신 수치 정확 적용)]
export function createRandomBlock() {
    let pool;
    const r = Math.random();
    
    if (state.diff === 'EASY') {
        // EASY: 1블록 20%, 2블록 55%, 3블록 25%
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; // 0.20 + 0.55 = 0.75
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'NORMAL') {
        // NORMAL: 1블록 15%, 2블록 60%, 3블록 25%
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; // 0.15 + 0.60 = 0.75
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HARD') {
        // HARD: 1블록 20%, 2블록 55%, 3블록 25% (Easy와 같지만 좁은 맵)
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; 
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HELL') {
        // HELL: 1블록 15%, 2블록 40%, 3블록 45%
        if (r < 0.15) pool = SHAPES_1;
        else if (r < 0.55) pool = SHAPES_2; // 0.15 + 0.40 = 0.55
        else pool = SHAPES_3;
    } 
    else {
        // 기본값 (Normal과 동일)
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; 
        else pool = SHAPES_3;
    }
    
    const shape = pool[Math.floor(Math.random() * pool.length)];
    const minIdx = getMinIdx();
    const items = [];
    
    for(let i=0; i<shape.map.length; i++) {
        let char;
        do { 
            const offset = (Math.random() > 0.6 ? 1 : 0) + (Math.random() > 0.85 ? 1 : 0);
            char = ALPHABET[minIdx + offset] || 'A';
        } while (items.length > 0 && char === items[items.length - 1]);
        items.push(char);
    }
    return { shape, items };
}

export function canPlaceAnywhere(block) {
    const size = state.gridSize;
    for(let r=0; r<size; r++) {
        for(let c=0; c<size; c++) {
            let possible = true;
            for(let j=0; j<block.shape.map.length; j++) {
                const tr = r + block.shape.map[j][0], tc = c + block.shape.map[j][1];
                if(tr>=size || tc>=size || state.grid[tr*size+tc] !== null) { possible = false; break; }
            }
            if(possible) return true;
        }
    }
    return false;
}

export function getCluster(startIdx) {
    const char = state.grid[startIdx];
    if (!char) return [];
    const cluster = [startIdx], queue = [startIdx], visited = new Set([startIdx]);
    const size = state.gridSize;
    while(queue.length > 0) {
        const curr = queue.pop();
        const neighbors = [curr-1, curr+1, curr-size, curr+size];
        for(let n of neighbors) {
            if(n<0 || n>=size*size) continue;
            if(Math.abs((n%size)-(curr%size)) > 1 && Math.abs(n-curr)===1) continue; 
            if(!visited.has(n) && state.grid[n] === char) {
                visited.add(n); cluster.push(n); queue.push(n);
            }
        }
    }
    return cluster;
}

// [3. DB 저장 수정: 난이도 인자를 직접 받음 + 대문자 강제 변환]
// 이 부분이 있어야 Lee_EASY, Lee_NORMAL 등으로 정확히 나뉘어 저장됩니다.
export async function saveScoreToDB(username, difficulty, isNewUser = false) {
    if (!db) return { success: false, msg: "DB Disconnected" };
    
    const cleanName = username.trim();
    // difficulty 인자가 없으면 state.diff를 쓰되, 무조건 대문자로 변환
    const safeDiff = (difficulty || state.diff || 'NORMAL').toUpperCase();
    
    const docId = `${cleanName}_${safeDiff}`;
    const currentScore = Number(state.score) || 0;

    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        if (isNewUser && docSnap.exists()) return { success: false, msg: "Name taken in this mode." };
        
        if (!isNewUser && docSnap.exists()) {
            const existingData = docSnap.data();
            if ((existingData.score || 0) >= currentScore) return { success: true, msg: "Score preserved." };
        }
        
        await setDoc(docRef, {
            username: cleanName,
            bestChar: state.best,
            difficulty: safeDiff, 
            score: currentScore, 
            timestamp: serverTimestamp()
        });
        return { success: true, msg: "Saved!" };
    } catch (e) { 
        console.error("DB Error:", e);
        return { success: false, msg: "Error: " + e.message }; 
    }
}

// [리더보드 로드 수정: 대문자 난이도로 조회]
export async function getLeaderboardData(targetDiff) {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboard"), 
            where("difficulty", "==", targetDiff.toUpperCase()), 
            orderBy("score", "desc")
        );
        const snapshot = await getDocs(q);
        const ranks = [];
        snapshot.forEach((doc) => ranks.push(doc.data()));
        return ranks;
    } catch (e) { 
        console.error("LB Error:", e);
        return []; 
    }
}
