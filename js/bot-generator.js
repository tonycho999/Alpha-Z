import { db } from "./firebase-config.js";
// [중요] firebase-config.js의 버전과 똑같이 맞춰주세요 (예: 10.12.2)
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; 

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

// 점수에 따라 적절한 알파벳(bestChar) 추측
function getBestCharByScore(score) {
    let charIndex = 0;
    if (score > 50000) charIndex = randomInt(15, 20); // P ~ U
    else if (score > 20000) charIndex = randomInt(12, 16); // M ~ Q
    else if (score > 10000) charIndex = randomInt(10, 14); // K ~ O
    else if (score > 5000) charIndex = randomInt(8, 11);  // I ~ L
    else if (score > 1000) charIndex = randomInt(5, 8);   // F ~ I
    else charIndex = randomInt(2, 5);                     // C ~ F
    return ALPHABET[charIndex];
}

function generateScoreData() {
    // [수정] EASY 난이도 추가 및 확률 조정
    const rand = Math.random();
    let difficulty = 'NORMAL';
    
    if (rand > 0.9) difficulty = 'HELL';       // 10%
    else if (rand > 0.7) difficulty = 'HARD';  // 20%
    else if (rand > 0.4) difficulty = 'NORMAL';// 30%
    else difficulty = 'EASY';                  // 40% (초보자 봇 많음)

    let score = 0;
    // 난이도별 점수 분포
    if (difficulty === 'EASY') score = randomInt(10, 5000); // [추가] EASY 점수
    else if (difficulty === 'NORMAL') score = randomInt(500, 30000);
    else if (difficulty === 'HARD') score = randomInt(100, 20000);
    else score = randomInt(50, 10000); 

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

// [수정] 삭제 기능 제거하고 오직 추가만 수행
export async function runBotGenerator() {
    // await clearOldBots(); // <-- 삭제 기능 끔

    const count = randomInt(90, 110); 
    console.log(`🚀 Adding ${count} new bots (including EASY mode)...`);
    
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
    
    console.log(`✅ Success! Added ${success} new bots.`);
    alert(`추가 완료! 새로운 봇 ${success}명(EASY 포함)을 리더보드에 등록했습니다.`);
    location.reload(); 
}
