// [1] firebase-config.js에서 db 가져오기
import { db } from "./firebase-config.js";

// [2] 버전 10.8.0 유지 (오류 방지)
import { collection, addDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

const COLLECTION_NAME = "leaderboard"; 

// 닉네임 재료
const GAME_PREFIXES = ["Super", "Pro", "Dr", "Master", "King", "Captain", "The", "Real", "Big", "Lil", "Crazy", "Iron", "Dark", "Light", "Ultra", "Mega", "Hyper", "Cyber", "Neo", "Epic", "Toxic", "Ninja", "Ghost", "Shadow", "Speed", "Lazy", "Happy", "Angry", "Lucky"];
const GLOBAL_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Alex", "Max", "Sam", "Tom", "Ben", "Dan", "Will", "Chris", "Steve", "Paul", "Antonio", "Jose", "Manuel", "Francisco", "David", "Juan", "Javier", "Luigi", "Mario", "Giovanni", "Pierre", "Sophie", "Lucas", "Lea", "Hans", "Julia", "Matteo", "Giulia", "Lukas", "Emma", "Haruto", "Yui", "Kenji", "Sakura", "Hiro", "Akira", "Yuki", "Ren", "Hina", "Rio", "Wei", "Li", "Zhang", "Chen", "Wang", "Liu", "Yang", "Huang", "Wu", "Zhou", "Ivan", "Anastasia", "Dmitry", "Olga", "Maxim", "Elena", "Alexei", "Katya", "Boris", "Luka"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
    const pattern = Math.random();
    const name = GLOBAL_NAMES[randomInt(0, GLOBAL_NAMES.length - 1)];
    if (pattern < 0.6) {
        const num = randomInt(1, 9999);
        return `${name}${num}`;
    } else if (pattern < 0.9) {
        const prefix = GAME_PREFIXES[randomInt(0, GAME_PREFIXES.length - 1)];
        return `${prefix}${name}`;
    } else {
        const name2 = GLOBAL_NAMES[randomInt(0, GLOBAL_NAMES.length - 1)];
        return `${name}_${name2}`;
    }
}

// 점수별 블록 알파벳 추정
function getBestCharByScore(score) {
    let charIndex = 0;
    if (score > 11000) charIndex = randomInt(15, 17); // P ~ R
    else if (score > 9000) charIndex = randomInt(13, 15); // N ~ P
    else if (score > 6000) charIndex = randomInt(11, 13); // L ~ N
    else if (score > 3000) charIndex = randomInt(8, 11);  // I ~ L
    else if (score > 1000) charIndex = randomInt(5, 8);   // F ~ I
    else charIndex = randomInt(2, 5);                     // C ~ F
    return ALPHABET[charIndex];
}

function generateScoreData() {
    const rand = Math.random();
    let difficulty = 'NORMAL';
    
    // 난이도 분포
    if (rand > 0.75) difficulty = 'HELL';
    else if (rand > 0.5) difficulty = 'HARD';
    else if (rand > 0.25) difficulty = 'NORMAL';
    else difficulty = 'EASY';

    // 점수: 1,000 ~ 12,000점
    let score = 0;
    const scoreLuck = Math.random();

    if (scoreLuck > 0.95) {
        score = randomInt(10000, 12000); // 상위 5% 고수
    } else if (scoreLuck > 0.7) {
        score = randomInt(6000, 9999);   // 중상위권
    } else {
        score = randomInt(1000, 5999);   // 일반 유저
    }

    score = Math.floor(score / 10) * 10;
    const bestChar = getBestCharByScore(score);

    return {
        username: generateName(),
        score: score,
        difficulty: difficulty, 
        timestamp: serverTimestamp(), 
        bestChar: bestChar, 
        isBot: true 
    };
}

// [수정] 삭제 함수 제거됨. 추가만 수행.
export async function runBotGenerator() {
    // await clearOldBots(); // <-- 삭제 기능 껐습니다.

    const count = randomInt(90, 110); 
    console.log(`🚀 ${count}명의 봇을 추가로 생성합니다... (기존 데이터 유지)`);
    
    let success = 0;
    const promises = [];
    
    for (let i = 0; i < count; i++) {
        const data = generateScoreData();
        promises.push(
            addDoc(collection(db, COLLECTION_NAME), data)
                .then(() => success++)
                .catch(e => console.error(e))
        );
    }

    await Promise.all(promises);
    
    console.log(`✅ 성공!`);
    alert(`성공! 기존 데이터를 지우지 않고, 새로운 봇 ${success}명을 추가했습니다.`);
    location.reload(); 
}
