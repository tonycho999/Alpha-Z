import { ALPHABET, SHAPES_1, SHAPES_2, SHAPES_3, state } from "./game-data.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

export async function saveScoreToDB(username) {
    try {
        const q = query(collection(db, "leaderboard"), where("username", "==", username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return { success: false, msg: "Name already exists!" };

        await addDoc(collection(db, "leaderboard"), {
            username, bestChar: state.best, scoreIndex: ALPHABET.indexOf(state.best),
            difficulty: state.diff, stars: state.stars, timestamp: serverTimestamp()
        });
        localStorage.setItem('alpha_username', username);
        return { success: true };
    } catch (e) { return { success: false, msg: "DB Error" }; }
}
