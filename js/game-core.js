import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [1. 수정된 블록 삭제 규칙: G까지는 1:1, 이후는 퐁당퐁당]
export function getMinIdx() {
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    let limitIdx = 0;

    // 난이도별 삭제 한계점(Limit) 설정
    switch(state.diff) {
        case 'EASY':
            limitIdx = 22; // W (W 이후로는 바닥 글자가 더 안 올라감)
            break;
        case 'NORMAL':
        case 'HARD':
            limitIdx = 20; // U
            break;
        case 'HELL':
            limitIdx = 18; // S
            break;
        default:
            limitIdx = 20;
    }

    // 현재 단계와 한계점 중 낮은 것 선택
    const effectiveIdx = Math.min(currentIdx, limitIdx);

    // [규칙 적용]
    // 1. E(인덱스 4) 미만이면 삭제 없음 (A부터 나옴)
    if (effectiveIdx < 4) return 0;

    // 2. E(4) ~ G(6) 구간: 1단계 상승마다 1개씩 삭제 (선형)
    // E(4) -> 1 (B부터)
    // F(5) -> 2 (C부터)
    // G(6) -> 3 (D부터)
    if (effectiveIdx <= 6) {
        return effectiveIdx - 3;
    }

    // 3. G(6) 이후 구간: 2단계 상승마다 1개씩 삭제 (퐁당퐁당)
    // G(6)가 베이스(3)가 됨.
    // H(7) -> 3 + 0 = 3
    // I(8) -> 3 + 1 = 4 (E부터, D삭제)
    // J(9) -> 3 + 1 = 4
    // K(10)-> 3 + 2 = 5 (F부터, E삭제)
    return 3 + Math.floor((effectiveIdx - 6) / 2);
}

// [2. 블록 출현 확률 (요청하신 수치 유지)]
export function createRandomBlock() {
    let pool;
    const r = Math.random();
    
    if (state.diff === 'EASY') {
        // EASY: 1블록 20%, 2블록 50%, 3블록 30%
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.70) pool = SHAPES_2; // 0.20 + 0.50 = 0.70
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'NORMAL') {
        // NORMAL: 1블록 15%, 2블록 50%, 3블록 35%
        if (r < 0.15) pool = SHAPES_1; 
        else if (r < 0.65) pool = SHAPES_2; // 0.15 + 0.50 = 0.65
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HARD') {
        // HARD: 1블록 20%, 2블록 50%, 3블록 30%
        if (r < 0.20) pool = SHAPES_1; 
        else if (r < 0.70) pool = SHAPES_2; 
        else pool = SHAPES_3;
    }
    else if (state.diff === 'HELL') {
        // HELL: 1블록 10%, 2블록 40%, 3블록 50%
        if (r < 0.10) pool = SHAPES_1;
        else if (r < 0.50) pool = SHAPES_2; // 0.10 + 0.40 = 0.50
        else pool = SHAPES_3;
    } 
    else {
        // 기본값 (Normal과 동일)
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
            // 블록 등급 결정 (+0 또는 +1)
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

// [DB 저장: 대문자 변환 및 난이도별 분리 저장]
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
