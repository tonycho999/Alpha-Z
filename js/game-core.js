import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
// [수정] collection, query, orderBy, limit, getDocs 추가됨
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export function getMinIdx() {
    let limitIdx = ALPHABET.indexOf('O');
    if(state.diff === 'EASY') limitIdx = ALPHABET.indexOf('S');
    else if(state.diff === 'HELL') limitIdx = ALPHABET.indexOf('K');

    const bestIdx = Math.min(ALPHABET.indexOf(state.best), limitIdx);
    return Math.max(0, Math.floor((bestIdx - 2) / 2));
}

export function createRandomBlock() {
    let pool = SHAPES_3; 
    if(state.diff === 'EASY' || state.diff === 'HARD') {
        const r = Math.random();
        if(r < 0.3) pool = SHAPES_1;
        else if(r < 0.6) pool = SHAPES_2;
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

// 점수 저장 함수 (중복 체크 포함)
export async function saveScoreToDB(username, isNewUser = false) {
    if (!username || username.trim() === "") return { success: false, msg: "Please enter a name." };
    
    const docId = username.trim(); 

    try {
        const docRef = doc(db, "leaderboard", docId);
        const docSnap = await getDoc(docRef);

        // 신규 등록인데 이미 문서가 존재하면 -> 중복 에러 처리
        if (isNewUser && docSnap.exists()) {
            return { success: false, msg: "🚫 Username already taken. Please choose another." };
        }

        const newScoreIndex = ALPHABET.indexOf(state.best);

        const newScoreData = {
            username: docId,
            bestChar: state.best,
            scoreIndex: newScoreIndex,
            difficulty: state.diff,
            stars: state.stars,
            timestamp: serverTimestamp()
        };

        // 기존 데이터가 있다면 점수 비교
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            if (newScoreIndex <= existingData.scoreIndex) {
                localStorage.setItem('alpha_username', docId);
                return { success: true, msg: "Score preserved (Higher score exists)." };
            }
        }

        await setDoc(docRef, newScoreData);
        localStorage.setItem('alpha_username', docId);
        return { success: true };

    } catch (e) { 
        console.error("Save Error:", e);
        return { success: false, msg: "Error saving score." }; 
    }
}

// [추가됨] 리더보드 데이터 가져오기 함수 (leaderboard.html에서 사용)
export async function getLeaderboardData() {
    try {
        const leaderboardRef = collection(db, "leaderboard");
        
        // 정렬: 점수(알파벳) 높은 순 -> 별 많은 순 -> 50명 제한
        const q = query(
            leaderboardRef, 
            orderBy("scoreIndex", "desc"), 
            orderBy("stars", "desc"), 
            limit(50)
        );

        const querySnapshot = await getDocs(q);
        const ranks = [];
        
        querySnapshot.forEach((doc) => {
            ranks.push(doc.data());
        });

        return ranks;
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        return [];
    }
}
