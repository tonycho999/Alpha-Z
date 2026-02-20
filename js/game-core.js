import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [수정 1] 난이도별 자동 승급(삭제) 규칙 적용
// 규칙: F(5)달성 -> A(0)삭제(Min=1), H(7) -> B(1)삭제(Min=2), J(9) -> C(2)삭제(Min=3)
export function getMinIdx() {
    const bestIdx = ALPHABET.indexOf(state.best);
    
    // 아직 F단계(Index 5) 미만이면 삭제 없음
    if (bestIdx < 5) return 0; 

    // 공식: (최고등급인덱스 - 3) / 2  (소수점 버림)
    // 예: F(5) -> (5-3)/2 = 1 (B부터 시작, A삭제)
    // 예: H(7) -> (7-3)/2 = 2 (C부터 시작, B삭제)
    let calcMin = Math.floor((bestIdx - 3) / 2);

    // [난이도별 상한선 제한]
    // EASY: T(Index 19)까지 삭제 가능 (Min Index 최대 8 = I)
    // NORMAL/HARD: R(Index 17)까지 (Min Index 최대 7 = H)
    // HELL: N(Index 13)까지 (Min Index 최대 5 = F)
    let limitChar = 'T';
    if (state.diff === 'HELL') limitChar = 'N';
    else if (state.diff === 'NORMAL' || state.diff === 'HARD') limitChar = 'R';

    const maxAllowedMin = Math.floor((ALPHABET.indexOf(limitChar) - 3) / 2);
    
    // 계산된 Min값과 난이도별 상한선 중 작은 값 적용
    return Math.min(calcMin, maxAllowedMin);
}

// [수정 2] 난이도별 블록 크기(1, 2, 3) 생성 확률 적용
export function createRandomBlock() {
    let pool;
    const r = Math.random(); // 0.0 ~ 1.0 랜덤값

    if (state.diff === 'EASY') {
        // 1블럭(20%), 2블럭(30%), 3블럭(50%)
        if (r < 0.2) pool = SHAPES_1;
        else if (r < 0.5) pool = SHAPES_2; // 0.2 + 0.3
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'HELL') {
        // 1블럭(0%), 2블럭(10%), 3블럭(90%)
        if (r < 0.1) pool = SHAPES_2;
        else pool = SHAPES_3;
    } 
    else { 
        // NORMAL, HARD (동일)
        // 1블럭(10%), 2블럭(30%), 3블럭(60%)
        if (r < 0.1) pool = SHAPES_1;
        else if (r < 0.4) pool = SHAPES_2; // 0.1 + 0.3
        else pool = SHAPES_3;
    }

    const shape = pool[Math.floor(Math.random() * pool.length)];
    
    // 현재 보드판의 최소 등급(minIdx)을 반영하여 블록 생성
    const minIdx = getMinIdx();
    const items = [];

    for(let i=0; i<shape.map.length; i++) {
        let char;
        do { 
            // 확률적으로 +1, +2 등급 높은 블록 생성
            const offset = (Math.random() > 0.6 ? 1 : 0) + (Math.random() > 0.85 ? 1 : 0);
            char = ALPHABET[minIdx + offset] || 'A';
        } while (items.length > 0 && char === items[items.length - 1]);
        items.push(char);
    }
    return { shape, items };
}

// ... (나머지 getCluster, canPlaceAnywhere, saveScoreToDB 등은 기존과 동일) ...
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
    // (기존 코드 유지)
    if (!username || username.trim() === "") return { success: false, msg: "Please enter a name." };
    const docId = username.trim(); 
    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        if (isNewUser && docSnap.exists()) return { success: false, msg: "🚫 Username already taken." };
        
        const newScoreIndex = ALPHABET.indexOf(state.best);
        const newScoreData = {
            username: docId, bestChar: state.best, scoreIndex: newScoreIndex,
            difficulty: state.diff, stars: state.stars, timestamp: serverTimestamp()
        };
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            if (newScoreIndex <= existingData.scoreIndex) {
                localStorage.setItem('alpha_username', docId);
                return { success: true, msg: "Score preserved." };
            }
        }
        await setDoc(docRef, newScoreData);
        localStorage.setItem('alpha_username', docId);
        return { success: true };
    } catch (e) { return { success: false, msg: "Error saving score." }; }
}

export async function getLeaderboardData() {
    // (기존 코드 유지)
    try {
        const leaderboardRef = collection(db, "leaderboard");
        const q = query(leaderboardRef, orderBy("scoreIndex", "desc"), orderBy("stars", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        const ranks = [];
        querySnapshot.forEach((doc) => ranks.push(doc.data()));
        return ranks;
    } catch (e) { return []; }
}
