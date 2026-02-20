import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
// Firebase 관련 함수
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// --- [기존 게임 로직 유지: getMinIdx, createRandomBlock, canPlaceAnywhere, getCluster] ---
// (이 부분은 수정하지 마세요. 위 코드 그대로 두시면 됩니다.)

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
// --- [기존 게임 로직 끝] ---


// [수정됨] DB 저장 함수 (안전장치 추가)
export async function saveScoreToDB(username, isNewUser = false) {
    console.log(`📡 DB 저장 시도: ${username}`); // 디버깅 로그

    if (!db) {
        console.error("❌ Firebase Config Error: db 객체가 없습니다.");
        return { success: false, msg: "DB Connection Failed" };
    }

    if (!username || username.trim() === "") return { success: false, msg: "Please enter a name." };
    
    const docId = username.trim(); 
    
    // state 값이 혹시 없을 경우를 대비한 안전장치
    const safeBest = state.best || 'A';
    const safeDiff = state.diff || 'NORMAL';
    const safeStars = (typeof state.stars === 'number') ? state.stars : 0;

    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        // 신규 유저 중복 체크
        if (isNewUser && docSnap.exists()) {
            return { success: false, msg: "🚫 Username already taken." };
        }
        
        const newScoreIndex = ALPHABET.indexOf(safeBest);
        
        // 데이터 객체 생성
        const newScoreData = {
            username: docId,
            bestChar: safeBest,
            difficulty: safeDiff,
            scoreIndex: Number(newScoreIndex),
            stars: Number(safeStars),
            timestamp: serverTimestamp()
        };
        
        // 점수 비교 (기존 점수가 더 높으면 덮어쓰지 않음)
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            
            // 1. 기존 점수(알파벳)가 더 높으면 저장 안 함
            if (existingData.scoreIndex > newScoreIndex) {
                 console.log("🛡️ 기존 점수가 더 높아 저장 건너뜀");
                 return { success: true, msg: "Score preserved (Higher score exists)." };
            }
            // 2. 점수는 같은데 별이 더 많거나 같으면 저장 안 함
            if (existingData.scoreIndex === newScoreIndex && existingData.stars >= newScoreData.stars) {
                 console.log("🛡️ 점수/별이 동일하거나 기존이 더 높아 저장 건너뜀");
                 return { success: true, msg: "Score preserved (Existing is better/equal)." };
            }
        }
        
        await setDoc(docRef, newScoreData);
        
        localStorage.setItem('alpha_username', docId);
        console.log("✅ DB 저장 성공:", docId);
        return { success: true, msg: "Saved Successfully!" };

    } catch (e) { 
        console.error("🔥 DB Save Error Detail:", e);
        return { success: false, msg: e.message }; 
    }
}

// 랭킹 가져오기 (기존 유지)
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
