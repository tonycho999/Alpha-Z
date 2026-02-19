import { ALPHABET, SHAPES, state } from "./game-data.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// 난이도별 블록 생성
export function createRandomBlock() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const maxIdx = ALPHABET.indexOf(state.best);
    let minIdx = 0;
    
    if(state.diff === 'HARD') minIdx = Math.max(0, maxIdx - 5);
    else if(state.diff === 'HELL') minIdx = Math.max(0, maxIdx - 8);
    else minIdx = Math.max(0, maxIdx - 3);

    const items = [getRandomChar(minIdx)];
    let s, t;
    do { s = getRandomChar(minIdx); } while (s === items[0]);
    items.push(s);
    do { t = getRandomChar(minIdx); } while (t === items[1]);
    items.push(t);

    return { shape, items };
}

function getRandomChar(minIdx) {
    const offset = Math.random() > 0.8 ? 1 : 0;
    return ALPHABET[minIdx + offset] || 'A';
}

// 배치 가능 여부 확인
export function canPlaceAnywhere(block) {
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            let possible = true;
            for(let j=0; j<block.shape.map.length; j++) {
                const tr = r + block.shape.map[j][0];
                const tc = c + block.shape.map[j][1];
                const tidx = tr * 5 + tc;
                if(tr>=5 || tc>=5 || state.grid[tidx] !== null) { possible = false; break; }
            }
            if(possible) return true;
        }
    }
    return false;
}

// 클러스터 탐색 (연결된 같은 블록 찾기)
export function getCluster(startIdx) {
    const char = state.grid[startIdx];
    if (!char) return [];
    const cluster = [startIdx], queue = [startIdx], visited = new Set([startIdx]);

    while(queue.length > 0) {
        const curr = queue.pop();
        const neighbors = [curr-1, curr+1, curr-5, curr+5];
        for(let n of neighbors) {
            if(n<0 || n>=25) continue;
            if(Math.abs((n%5)-(curr%5)) > 1 && Math.abs(n-curr)===1) continue; // 줄바꿈 방지
            if(!visited.has(n) && state.grid[n] === char) {
                visited.add(n); cluster.push(n); queue.push(n);
            }
        }
    }
    return cluster;
}

// DB 저장
export async function saveScoreToDB(username) {
    try {
        // 중복 체크
        const q = query(collection(db, "leaderboard"), where("username", "==", username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return { success: false, msg: "이미 존재하는 이름입니다." };

        await addDoc(collection(db, "leaderboard"), {
            username, bestChar: state.best,
            scoreIndex: ALPHABET.indexOf(state.best),
            difficulty: state.diff, stars: state.stars,
            timestamp: serverTimestamp()
        });
        localStorage.setItem('alpha_username', username);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, msg: "DB 저장 오류" };
    }
}
