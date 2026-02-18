import { db, auth } from './firebase_config.js';

// URL 파라미터에서 난이도 가져오기
const urlParams = new URLSearchParams(window.location.search);
const difficulty = urlParams.get('diff') || 'normal'; // normal, hard, extreme

let maxTile = 'A'; // 현재까지 만든 가장 높은 타일

// 알파벳을 숫자로 변환 (A=1, B=2...)
const charToNum = (char) => char.charCodeAt(0) - 64;
const numToChar = (num) => String.fromCharCode(64 + num);

// 타일 생성 규칙 (Spawn Rules)
function getNewTileValue() {
    let roll = Math.random();
    let possibleTiles = [];

    // 난이도별 로직
    if (difficulty === 'normal') {
        // C 타일 생성 조건: G(7) 도달 시
        if (charToNum(maxTile) >= 7) { 
            // 확률: C 60%, D 30%, E 10% (예시 단순화)
            if (roll < 0.6) return 'C';
            if (roll < 0.9) return 'D';
            return 'E';
        }
        // D 타일 생성 조건: J(10) 도달 시... (생략, 표에 따라 구현)
    } 
    
    // 기본 생성 (초반)
    return Math.random() < 0.9 ? 'A' : 'B';
}

// 타일 삭제 규칙 (Remove Rules) - 턴이 끝날 때마다 호출
function checkRemoveRules(grid) {
    let removeTarget = null;

    if (difficulty === 'normal') {
        if (maxTile >= 'F') removeTarget = 'A'; // F 도달 시 A 삭제
        if (maxTile >= 'I') removeTarget = 'B';
        if (maxTile >= 'L') removeTarget = 'C';
    } else if (difficulty === 'hard') {
        if (maxTile >= 'J') removeTarget = 'A';
        // ... 표 내용 구현
    }

    if (removeTarget) {
        // 그리드 전체를 순회하며 해당 타일 삭제
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (grid[r][c] && grid[r][c].value === removeTarget) {
                    grid[r][c] = null; // 타일 제거
                    // 제거 이펙트 함수 호출
                }
            }
        }
    }
}

// Z 달성 체크
function checkWinCondition() {
    if (maxTile === 'Z') {
        // 게임 승리! 
        // Firebase에 기록 저장 (난이도, 시간)
        saveToHallOfFame();
    }
}
