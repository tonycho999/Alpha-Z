import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [난이도별 블록 삭제 규칙 적용]
export function getMinIdx() {
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    let limitIdx = 0;

    // 1. 난이도별 삭제 한계점(Limit) 설정
    switch(state.diff) {
        case 'EASY':
            limitIdx = 21; // V (V 이후로는 더 삭제 안 됨)
            break;
        case 'NORMAL':
        case 'HARD':
            limitIdx = 19; // T (T 이후로는 더 삭제 안 됨)
            break;
        case 'HELL':
            limitIdx = 17; // R (R 이후로는 더 삭제 안 됨)
            break;
        default:
            limitIdx = 19;
    }

    // 2. 현재 단계와 한계점 중 낮은 것 선택
    const effectiveIdx = Math.min(currentIdx, limitIdx);

    // 3. 삭제 공식 적용 (F(5) -> 1(B), H(7) -> 2(C))
    // 공식: floor((단계 - 3) / 2)
    // 5(F) - 3 = 2 / 2 = 1 (B)
    // 7(H) - 3 = 4 / 2 = 2 (C)
    return Math.max(0, Math.floor((effectiveIdx - 3) / 2));
}

// [블록 출현 확률 - 이전 확정 수치 유지]
export function createRandomBlock() {
    let pool;
    const r = Math.random();
    
    if (state.diff === 'EASY') {
        // EASY: 1블록 20%, 2블록 55%, 3블록 25%
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; 
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'NORMAL') {
        // NORMAL: 1블록 15%, 2블록 60%, 3블록 25%
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; 
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HARD') {
        // HARD: 1블록 20%, 2블록 55%, 3블록 25%
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.75) pool = SHAPES_2; 
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HELL') {
        // HELL: 1블록 15%, 2블록 40%, 3블록 45%
        if (r < 0.15) pool = SHAPES_1;
        else if (r < 0.55) pool = SHAPES_2; 
        else pool = SHAPES_3;
    } 
    else {
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
            // 블록 등급 결정 (약간의 랜덤성 포함)
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

export async function saveScoreToDB(username, isNewUser = false) {
    if (!db) return { success: false, msg: "DB Disconnected" };
    
    const cleanName = username.trim();
    const safeDiff = state.diff || 'NORMAL'; 
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

export async function getLeaderboardData(targetDiff) {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboard"), 
            where("difficulty", "==", targetDiff), 
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
