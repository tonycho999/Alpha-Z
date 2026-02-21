import { ALPHABET, state, SHAPES_1, SHAPES_2, SHAPES_3 } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export function getMinIdx() {
    const bestIdx = ALPHABET.indexOf(state.best);
    if (bestIdx < 5) return 0; 
    let calcMin = Math.floor((bestIdx - 3) / 2);
    const maxAllowedMin = Math.floor((ALPHABET.indexOf('T') - 3) / 2);
    return Math.min(calcMin, maxAllowedMin);
}

export function createRandomBlock() {
    let pool;
    const r = Math.random();
    if (state.diff === 'EASY') { if (r < 0.2) pool = SHAPES_1; else if (r < 0.5) pool = SHAPES_2; else pool = SHAPES_3; } 
    else if (state.diff === 'HELL') { if (r < 0.1) pool = SHAPES_2; else pool = SHAPES_3; } 
    else { if (r < 0.1) pool = SHAPES_1; else if (r < 0.4) pool = SHAPES_2; else pool = SHAPES_3; }
    
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

// [DB 저장] Score 저장 로직 수정 (Insufficient Error 해결용)
export async function saveScoreToDB(username, isNewUser = false) {
    if (!db) return { success: false, msg: "DB Connection Error" };
    
    const docId = username.trim();
    const safeDiff = state.diff || 'NORMAL'; 
    const safeBest = state.best || 'A';
    const currentScore = state.score || 0;

    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        if (isNewUser && docSnap.exists()) return { success: false, msg: "Username taken." };
        if (!isNewUser && docSnap.exists()) {
            const existingData = docSnap.data();
            // 점수가 기존보다 낮으면 저장 안함
            if ((existingData.score || 0) >= currentScore) return { success: true, msg: "Score preserved." };
        }
        
        // [중요] stars 제외, score 추가
        await setDoc(docRef, {
            username: docId,
            bestChar: safeBest,
            difficulty: safeDiff, 
            score: Number(currentScore), 
            timestamp: serverTimestamp()
        });
        return { success: true, msg: "Saved!" };
    } catch (e) { 
        console.error("DB Error:", e);
        return { success: false, msg: e.message }; 
    }
}

// [리더보드] 점수 기준 정렬
export async function getLeaderboardData(targetDiff) {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboard"), 
            where("difficulty", "==", targetDiff), 
            orderBy("score", "desc") // score 기준
        );
        const snapshot = await getDocs(q);
        const ranks = [];
        snapshot.forEach((doc) => ranks.push(doc.data()));
        return ranks;
    } catch (e) { 
        console.error("Leaderboard Error:", e);
        return []; 
    }
}
