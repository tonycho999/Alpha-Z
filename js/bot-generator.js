import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"; 

// [설정] 본인의 Firestore 컬렉션 이름으로 수정하세요 (보통 'scores' 또는 'leaderboard')
const COLLECTION_NAME = "scores"; 

// 봇 이름 재료
const ADJECTIVES = ["Happy", "Angry", "Fast", "Lazy", "Super", "Mega", "Tiny", "Iron", "Gold", "Lucky", "Crazy", "Dr", "Master", "Pro", "Noob"];
const NOUNS = ["Cat", "Dog", "Tiger", "Lion", "Bear", "Wolf", "Fox", "Panda", "Dragon", "Ghost", "Alien", "Robot", "Ninja", "Wizard", "King"];
const K_PREFIX = ["행복한", "화난", "빠른", "느긋한", "슈퍼", "메가", "작은", "강철", "황금", "운좋은", "미친", "닥터", "마스터", "프로", "초보"];
const K_SUFFIX = ["고양이", "강아지", "호랑이", "사자", "곰", "늑대", "여우", "팬더", "용", "유령", "외계인", "로봇", "닌자", "마법사", "왕"];

// 랜덤 정수 생성
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 랜덤 이름 생성 (한글/영문 섞음)
function generateName() {
    if (Math.random() > 0.5) {
        // 영문 이름
        const adj = ADJECTIVES[randomInt(0, ADJECTIVES.length - 1)];
        const noun = NOUNS[randomInt(0, NOUNS.length - 1)];
        const num = Math.random() > 0.7 ? randomInt(1, 999) : "";
        return `${adj}${noun}${num}`;
    } else {
        // 한글 이름
        const pre = K_PREFIX[randomInt(0, K_PREFIX.length - 1)];
        const suf = K_SUFFIX[randomInt(0, K_SUFFIX.length - 1)];
        const num = Math.random() > 0.7 ? randomInt(1, 99) : "";
        return `${pre}${suf}${num}`;
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
    // 난이도별 점수 분포 (현실적으로)
    if (diff === 'NORMAL') score = randomInt(500, 30000);
    else if (diff === 'HARD') score = randomInt(100, 20000);
    else score = randomInt(50, 10000); // 헬은 점수 따기 어려움

    // 점수는 10단위로 끊기
    score = Math.floor(score / 10) * 10;

    return {
        username: generateName(),
        score: score,
        diff: diff,
        date: serverTimestamp(), // Firebase 서버 시간
        isBot: true // 나중에 봇만 지우고 싶을 때를 대비해 표시
    };
}

// [핵심] 봇 생성 실행 함수
export async function runBotGenerator() {
    const count = randomInt(90, 110); // 90~110명 랜덤
    console.log(`🚀 Generating ${count} bots...`);
    
    let success = 0;
    
    const promises = [];
    for (let i = 0; i < count; i++) {
        const data = generateScoreData();
        // 비동기 병렬 처리로 빠르게 입력
        promises.push(
            addDoc(collection(db, COLLECTION_NAME), data)
                .then(() => success++)
                .catch(e => console.error(e))
        );
    }

    await Promise.all(promises);
    
    console.log(`✅ Success! Added ${success} bot scores to '${COLLECTION_NAME}'.`);
    alert(`완료! ${success}개의 봇 데이터를 생성했습니다.`);
    location.reload(); // 리더보드 확인을 위해 새로고침
}
