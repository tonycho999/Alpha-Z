import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ... (getMinIdx, createRandomBlock 등 기존 로직 유지) ...
export function getMinIdx() {
    const bestIdx = ALPHABET.indexOf(state.best);
    if (bestIdx < 5) return 0; 
    let calcMin = Math.floor((bestIdx - 3) / 2);
    let limitChar = 'T';
    if (state.diff === 'HELL') limitChar = 'N';
    else if (state.diff === 'NORMAL' || state.diff === 'HARD') limitChar = 'R';
    const maxAllowedMin = Math.floor((ALPHABET.indexOf(limitChar) - 3) / 2);
    return Math.min(calcMin, maxAllowedMin);
}
export function createRandomBlock() {
    let pool;
    const r = Math.random();
    if (state.diff === 'EASY') {
        if (r < 0.2) pool = SHAPES_1; else if (r < 0.5) pool = SHAPES_2; else pool = SHAPES_3;
    } else if (state.diff === 'HELL') {
        if (r < 0.1) pool = SHAPES_2; else pool = SHAPES_3;
    } else { 
        if (r < 0.1) pool = SHAPES_1; else if (r < 0.4) pool = SHAPES_2; else pool = SHAPES_3;
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
// ... (여기까지 기존 코드) ...

// [핵심] DB 저장 함수 (안전장치 + 디버깅 로그)
export async function saveScoreToDB(username, isNewUser = false) {
    console.log(`💾 저장 시도: ${username} (신규: ${isNewUser})`);

    if (!db) {
        console.error("❌ DB 연결 실패");
        return { success: false, msg: "DB Connection Error" };
    }
    
    // 1. 데이터 강제 보정 (HARD 모드 등 대비)
    const docId = username.trim();
    const safeDiff = state.diff || 'NORMAL'; 
    const safeBest = state.best || 'A';
    const safeStars = Number(state.stars || 0);
    const newScoreIndex = ALPHABET.indexOf(safeBest);

    // 디버깅: 실제로 뭘 보내는지 콘솔에 찍음
    console.log("📋 전송 데이터:", { id: docId, diff: safeDiff, best: safeBest, stars: safeStars });

    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        // 신규 유저 중복 체크
        if (isNewUser && docSnap.exists()) {
            return { success: false, msg: "🚫 Username already taken." };
        }
        
        // 기존 유저 점수 비교
        if (!isNewUser && docSnap.exists()) {
            const existingData = docSnap.data();
            // 점수가 낮으면 저장 안 함
            if (existingData.scoreIndex > newScoreIndex) {
                 return { success: true, msg: "Score preserved (Higher score exists)." };
            }
            if (existingData.scoreIndex === newScoreIndex && existingData.stars >= safeStars) {
                 return { success: true, msg: "Score preserved (Existing is better/equal)." };
            }
        }
        
        // 저장
        await setDoc(docRef, {
            username: docId,
            bestChar: safeBest,
            difficulty: safeDiff, 
            scoreIndex: Number(newScoreIndex),
            stars: Number(safeStars),
            timestamp: serverTimestamp()
        });
        
        console.log("✅ 저장 성공!");
        return { success: true, msg: "Saved Successfully!" };

    } catch (e) { 
        console.error("🔥 DB 저장 에러:", e);
        return { success: false, msg: e.message }; 
    }
}

export async function getLeaderboardData(targetDiff) {
    if (!db) return [];
    try {
        const leaderboardRef = collection(db, "leaderboard");
        const q = query(
            leaderboardRef, 
            where("difficulty", "==", targetDiff), 
            orderBy("scoreIndex", "desc"), 
            orderBy("stars", "desc"), 
            limit(50)
        );
        const querySnapshot = await getDocs(q);
        const ranks = [];
        querySnapshot.forEach((doc) => ranks.push(doc.data()));
        return ranks;
    } catch (e) { 
        console.error("Error fetching leaderboard:", e);
        return []; 
    }
}
