import { db } from "./firebase-config.js";
// [중요] firebase-config.js의 버전과 똑같이 맞춰주세요 (예: 10.12.2)
import { collection, addDoc, getDocs, deleteDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

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
    // 점수가 높을수록 알파벳 뒤쪽 글자 부여 (대략적인 로직)
    if (score > 50000) charIndex = randomInt(15, 20); // P ~ U
    else if (score > 20000) charIndex = randomInt(12, 16); // M ~ Q
    else if (score > 10000) charIndex = randomInt(10, 14); // K ~ O
    else if (score > 5000) charIndex = randomInt(8, 11);  // I ~ L
    else if (score > 1000) charIndex = randomInt(5, 8);   // F ~ I
    else charIndex = randomInt(2, 5);                     // C ~ F
    return ALPHABET[charIndex];
}

function generateScoreData() {
    const diffs = ['NORMAL', 'HARD', 'HELL'];
    const rand = Math.random();
    let difficulty = 'NORMAL';
    if (rand > 0.8) difficulty = 'HELL';
    else if (rand > 0.5) difficulty = 'HARD';

    let score = 0;
    if (difficulty === 'NORMAL') score = randomInt(500, 30000);
    else if (difficulty === 'HARD') score = randomInt(100, 20000);
    else score = randomInt(50, 10000); 

    score = Math.floor(score / 10) * 10;
    const bestChar = getBestCharByScore(score);

    // [핵심] 실제 DB 양식과 똑같이 필드명 맞춤
    return {
        username: generateName(),
        score: score,
        difficulty: difficulty, // diff -> difficulty
        timestamp: serverTimestamp(), // date -> timestamp
        bestChar: bestChar, // 추가됨
        isBot: true 
    };
}

// [1] 기존 봇 데이터 삭제 함수
async function clearOldBots() {
    console.log("🧹 Cleaning up old bots...");
    // isBot이 true인 데이터만 찾아서 삭제
    const q = query(collection(db, COLLECTION_NAME), where("isBot", "==", true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("No bots to delete.");
        return;
    }

    const deletePromises = [];
    snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${deletePromises.length} old bot entries.`);
}

// [2] 실행 함수 (삭제 후 생성)
export async function runBotGenerator() {
    // 먼저 기존 봇 삭제
    await clearOldBots();

    // 새 봇 생성
    const count = randomInt(90, 110); 
    console.log(`🚀 Generating ${count} correct bots...`);
    
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
    
    console.log(`✅ Success! Added ${success} bots with correct format.`);
    alert(`청소 완료! 올바른 형식의 봇 ${success}명을 새로 생성했습니다.`);
    location.reload(); 
}
