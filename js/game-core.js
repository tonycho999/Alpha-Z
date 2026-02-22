import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [1. 3회 연속 삭제 후 1회 휴식 규칙 적용]
export function getMinIdx() {
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    let limitIdx = 0;

    // 난이도별 삭제 한계점(Limit)
    switch(state.diff) {
        case 'EASY': limitIdx = 22; break; // W
        case 'NORMAL':
        case 'HARD': limitIdx = 20; break; // U
        case 'HELL': limitIdx = 18; break; // S
        default: limitIdx = 20;
    }

    const effectiveIdx = Math.min(currentIdx, limitIdx);

    // E(4) 미만이면 삭제 없음
    if (effectiveIdx < 4) return 0;

    // [3회 상승 후 1회 휴식 공식]
    // n = 0(E), 1(F), 2(G), 3(H), 4(I), 5(J), 6(K), 7(L)...
    const n = effectiveIdx - 4;
    
    // 공식 설명: 4개 주기로 3개씩 인덱스가 올라감 (Math.min으로 휴식기 구현)
    // E(4)->1, F(5)->2, G(6)->3, H(7)->3(휴식)
    // I(8)->4, J(9)->5, K(10)->6, L(11)->6(휴식)
    return Math.floor(n / 4) * 3 + Math.min(2, n % 4) + 1;
}

// [2. 블록 출현 확률 (최신 요청 수치 적용)]
export function createRandomBlock() {
    let pool;
    const r = Math.random();
    
    // EASY & HARD 확률 동일 (15% / 55% / 30%)
    if (state.diff === 'EASY' || state.diff === 'HARD') {
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.70) pool = SHAPES_2; // 0.15 + 0.55 = 0.70
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'NORMAL') {
        // NORMAL: 15% / 50% / 35%
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.65) pool = SHAPES_2; // 0.15 + 0.50 = 0.65
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HELL') {
        // HELL: 10% / 40% / 50%
        if (r < 0.10) pool = SHAPES_1;
        else if (r < 0.50) pool = SHAPES_2; // 0.10 + 0.40 = 0.50
        else pool = SHAPES_3;
    } 
    else {
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.65) pool = SHAPES_2; 
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

export async function saveScoreToDB(username, difficulty, isNewUser = false) {
    if (!db) return { success: false, msg: "DB Disconnected" };
    const cleanName = username.trim();
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
    } catch (e) { console.error("DB Error:", e); return { success: false, msg: "Error: " + e.message }; }
}

export async function getLeaderboardData(targetDiff) {
    if (!db) return [];
    try {
        const q = query(collection(db, "leaderboard"), where("difficulty", "==", targetDiff.toUpperCase()), orderBy("score", "desc"));
        const snapshot = await getDocs(q);
        const ranks = [];
        snapshot.forEach((doc) => ranks.push(doc.data()));
        return ranks;
    } catch (e) { console.error("LB Error:", e); return []; }
}
