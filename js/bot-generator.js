import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

// [설정] 컬렉션 이름 (수정 필요시 변경)
const COLLECTION_NAME = "scores"; 

// 1. 게임 느낌 나는 접두사 (영어)
const GAME_PREFIXES = [
    "Super", "Pro", "Dr", "Master", "King", "Captain", "The", "Real", "Big", "Lil",
    "Crazy", "Iron", "Dark", "Light", "Ultra", "Mega", "Hyper", "Cyber", "Neo", "Epic",
    "Toxic", "Ninja", "Ghost", "Shadow", "Speed", "Lazy", "Happy", "Angry", "Lucky"
];

// 2. 글로벌 사람 이름 (10개국 이상 혼합 - 로마자 표기)
const GLOBAL_NAMES = [
    // English (영미권)
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
    "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Alex", "Max", "Sam", "Tom", "Ben", "Dan", "Will", "Chris", "Steve", "Paul",
    
    // European (스페인, 프랑스, 독일, 이탈리아 등)
    "Antonio", "Jose", "Manuel", "Francisco", "David", "Juan", "Javier", "Luigi", "Mario", "Giovanni",
    "Pierre", "Sophie", "Lucas", "Lea", "Hans", "Julia", "Matteo", "Giulia", "Lukas", "Emma",
    "Gabriel", "Leo", "Raphael", "Arthur", "Louis", "Mila", "Liam", "Noah", "Elias", "Leon",
    
    // Asian (일본, 중국, 인도, 한국-로마자)
    "Haruto", "Yui", "Kenji", "Sakura", "Hiro", "Akira", "Yuki", "Ren", "Hina", "Rio",
    "Wei", "Li", "Zhang", "Chen", "Wang", "Liu", "Yang", "Huang", "Wu", "Zhou",
    "Aarav", "Vihaan", "Aditi", "Sai", "Rohan", "Priya", "Arjun", "Reyansh", "Ishaan", "Vivaan",
    "Minho", "Jisoo", "Hyun", "Jin", "Sumin", "Jun", "Min", "Seo", "Ji", "Soo",
    
    // Russian / Slavic (러시아, 동유럽)
    "Ivan", "Anastasia", "Dmitry", "Olga", "Maxim", "Elena", "Alexei", "Katya", "Boris", "Luka",
    "Nikolai", "Tatiana", "Vladimir", "Irina", "Sergei", "Natalia", "Mikhail", "Svetlana", "Yuri",
    
    // Arabic / Middle Eastern (아랍, 중동)
    "Ali", "Omar", "Ahmed", "Fatima", "Mohamed", "Aisha", "Hassan", "Mariam", "Yusuf", "Zain"
];

// 랜덤 정수 생성
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// [핵심] 랜덤 닉네임 생성 로직 (3가지 패턴)
function generateName() {
    const pattern = Math.random();
    const name = GLOBAL_NAMES[randomInt(0, GLOBAL_NAMES.length - 1)];
    
    if (pattern < 0.6) {
        // 패턴 1 (60%): 이름 + 숫자 (예: James23, Hans1999)
        const num = randomInt(1, 9999);
        return `${name}${num}`;
    } else if (pattern < 0.9) {
        // 패턴 2 (30%): 접두사 + 이름 (예: ProMario, DrLee)
        const prefix = GAME_PREFIXES[randomInt(0, GAME_PREFIXES.length - 1)];
        return `${prefix}${name}`;
    } else {
        // 패턴 3 (10%): 이름_이름 (예: Alex_Smith)
        const name2 = GLOBAL_NAMES[randomInt(0, GLOBAL_NAMES.length - 1)];
        return `${name}_${name2}`;
    }
}

// 랜덤 난이도 및 점수 생성
function generateScoreData() {
    const diffs = ['NORMAL', 'HARD', 'HELL'];
    // 난이도 확률: NORMAL(50%), HARD(30%), HELL(20%)
    const rand = Math.random();
    let diff = 'NORMAL';
    if (rand > 0.8) diff = 'HELL';
    else if (rand > 0.5) diff = 'HARD';

    let score = 0;
    // 난이도별 점수 분포 (약간의 현실성 부여)
    if (diff === 'NORMAL') score = randomInt(500, 30000);
    else if (diff === 'HARD') score = randomInt(100, 20000);
    else score = randomInt(50, 10000); 

    // 점수는 10단위로 깔끔하게
    score = Math.floor(score / 10) * 10;

    return {
        username: generateName(),
        score: score,
        diff: diff,
        date: serverTimestamp(), 
        isBot: true 
    };
}

// 봇 생성 실행 함수
export async function runBotGenerator() {
    const count = randomInt(90, 110); 
    console.log(`🚀 Generating ${count} global user bots...`);
    
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
    
    console.log(`✅ Success! Added ${success} global bots.`);
    alert(`완료! ${success}명의 글로벌 유저(봇) 데이터를 생성했습니다.`);
    location.reload(); 
}
