import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [난이도별 바닥 글자 상승 속도 조절]
export function getMinIdx() {
    const currentIdx = ALPHABET.indexOf(state.currentMax);
    
    switch(state.diff) {
        case 'EASY':
            // Easy: 최고 기록보다 4단계 아래부터 나옴 (성장 빠름)
            return Math.max(0, currentIdx - 4);
            
        case 'NORMAL':
            // Normal: 적당한 속도
            return Math.max(0, Math.floor((currentIdx - 3) / 1.5));
            
        case 'HARD':
            // Hard: 맵이 좁으므로 바닥 글자라도 좀 따라와줘야 함
            return Math.max(0, Math.floor((currentIdx - 4) / 2));
            
        case 'HELL':
            // Hell: 바닥 글자가 아주 천천히 오름 (노가다 & 공간 압박)
            return Math.max(0, Math.floor(currentIdx / 3));
            
        default:
            return 0;
    }
}

// [핵심: 요청하신 블록 출현 확률 적용]
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
        // HARD: 1블록 20%, 2블록 55%, 3블록 25% (Easy와 같지만 7x7 맵이라 어려움)
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
            // 블록 등급 결정 (약간의 랜덤성)
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
