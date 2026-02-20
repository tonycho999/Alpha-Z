import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
// Firebase 관련 함수 (v9 Modular)
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// [중요] 이 파일이 서버에 없으면 "MIME type" 에러가 납니다. .gitignore 확인 필수!
import { db } from "./firebase-config.js";

// 난이도별 자동 승급(삭제) 규칙
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

// 블록 생성 확률
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

// [핵심] DB 저장 함수 (보안 규칙 준수)
export async function saveScoreToDB(username, isNewUser = false) {
    // 1. DB 연결 확인
    if (!db) {
        console.error("❌ Firebase Config Error: db 객체 없음. 서버 파일 누락 가능성.");
        return { success: false, msg: "DB Connection Failed (Check .gitignore)" };
    }

    if (!username || username.trim() === "") return { success: false, msg: "Please enter a name." };
    
    // 문서 ID는 소문자로 변환하지 않고 입력값 그대로 사용 (보안 규칙 username 체크)
    const docId = username.trim(); 
    
    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);
        
        // 신규 유저 중복 체크
        if (isNewUser && docSnap.exists()) {
            return { success: false, msg: "🚫 Username already taken." };
        }
        
        const newScoreIndex = ALPHABET.indexOf(state.best);
        
        // 보안 규칙의 isValidScore() 요구사항에 정확히 맞춘 데이터 객체
        const newScoreData = {
            username: docId,                    // string
            bestChar: state.best,               // string (size 1)
            difficulty: state.diff,             // string (in list)
            scoreIndex: Number(newScoreIndex),  // number (규칙엔 없지만 정렬용)
            stars: Number(state.stars),         // number (규칙 필수)
            timestamp: serverTimestamp()        // timestamp
        };
        
        // 기존 점수 확인 및 비교 (보안 규칙 update 조건: 점수가 높거나 같아야 함)
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            // 기존 점수(scoreIndex)가 더 높으면 갱신하지 않고 성공 처리
            if (existingData.scoreIndex > newScoreIndex) {
                 return { success: true, msg: "Score preserved (Existing is higher)." };
            }
            // 점수가 같은데 별이 더 적으면 갱신 안 함
            if (existingData.scoreIndex === newScoreIndex && existingData.stars > newScoreData.stars) {
                 return { success: true, msg: "Score preserved (More stars existing)." };
            }
        }
        
        // setDoc을 사용하면 문서가 없으면 생성, 있으면 덮어쓰기(merge:false가 기본)
        await setDoc(docRef, newScoreData);
        
        localStorage.setItem('alpha_username', docId);
        console.log("✅ 저장 완료:", docId);
        return { success: true };

    } catch (e) { 
        console.error("🔥 DB Save Error:", e);
        // 에러 메시지가 'Missing or insufficient permissions'라면 규칙 위반임
        return { success: false, msg: e.message }; 
    }
}

// 랭킹 가져오기
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
