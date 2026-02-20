import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// [수정 2] 난이도별 자동 승급(삭제) 규칙
export function getMinIdx() {
    const bestIdx = ALPHABET.indexOf(state.best);
    
    // F(Index 5) 미만이면 삭제 없음
    if (bestIdx < 5) return 0; 

    // 공식: (최고등급인덱스 - 3) / 2
    let calcMin = Math.floor((bestIdx - 3) / 2);

    // [난이도별 상한선 제한]
    let limitChar = 'T';
    if (state.diff === 'HELL') limitChar = 'N';
    else if (state.diff === 'NORMAL' || state.diff === 'HARD') limitChar = 'R';

    const maxAllowedMin = Math.floor((ALPHABET.indexOf(limitChar) - 3) / 2);
    
    return Math.min(calcMin, maxAllowedMin);
}

// [수정 3] 블록 생성 확률
export function createRandomBlock() {
    let pool;
    const r = Math.random();

    if (state.diff === 'EASY') {
        if (r < 0.2) pool = SHAPES_1;
        else if (r < 0.5) pool = SHAPES_2;
        else pool = SHAPES_3;
    } 
    else if (state.diff === 'HELL') {
        if (r < 0.1) pool = SHAPES_2;
        else pool = SHAPES_3;
    } 
    else { 
        if (r < 0.1) pool = SHAPES_1;
        else if (r < 0.4) pool = SHAPES_2; 
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

export async function saveScoreToDB(username, isNewUser = false) {
    // [DB 연결 체크]
    if (!db) {
        console.error("Firebase DB is not connected.");
        return { success: false, msg: "DB Connection Failed (Check firebase-config.js)" };
    }

    if (!username || username.trim() === "") return { success: false, msg: "Please enter a name." };
    const docId = username.trim(); 
    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        // 신규 유저인데 이미 닉네임이 있는 경우
        if (isNewUser && docSnap.exists()) return { success: false, msg: "🚫 Username already taken." };
        
        const newScoreIndex = ALPHABET.indexOf(state.best);
        const newScoreData = {
            username: docId, bestChar: state.best, scoreIndex: newScoreIndex,
            difficulty: state.diff, stars: state.stars, timestamp: serverTimestamp()
        };
        
        // 기존 유저 점수 갱신 로직
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            // 기존 점수가 더 높으면 갱신 안 함 (서버 비용 절약)
            if (newScoreIndex < existingData.scoreIndex) {
                 return { success: true, msg: "Score preserved (Existing score is higher)." };
            }
        }
        
        await setDoc(docRef, newScoreData);
        localStorage.setItem('alpha_username', docId);
        return { success: true };
    } catch (e) { 
        console.error("DB Save Error:", e);
        // 에러 메시지를 상세하게 반환하도록 수정
        return { success: false, msg: e.message || "Error saving score." }; 
    }
}

// [수정 4] 난이도별 랭킹 가져오기
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
