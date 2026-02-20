// js/game-data.js

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// [중요] 블록 모양 데이터 (이게 없으면 블록이 안 나옵니다)
// 1칸짜리
export const SHAPES_1 = [
    { id: '1a', map: [[0,0]], w:1, h:1 }
];

// 2칸짜리
export const SHAPES_2 = [
    { id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, // 가로
    { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }  // 세로
];

// 3칸짜리
export const SHAPES_3 = [
    { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, // 가로 3
    { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, // 세로 3
    { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, // ㄱ
    { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, // ㄴ
    { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, // r
    { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 }  // ㅢ
];

export const state = {
    gridSize: 8,
    grid: [],
    
    // [핵심 수정] 이 부분이 없어서 에러가 났던 겁니다!
    hand: [null, null, null], // 3개의 블록 슬롯
    dragIndex: -1,            // 드래그 중인 슬롯 번호
    
    score: 0,
    stars: 0,
    best: 'A',
    
    isLocked: false,
    isReviveTurn: false,
    hasRevived: false,
    hasReachedO: false,
    
    isAdmin: false,
    diff: 'NORMAL',
    
    isHammerMode: false,
    nextBlock: null // (구버전 호환용)
};

// 난이도별 그리드 사이즈 설정
export function initGridSize(diff) {
    if(diff === 'EASY') state.gridSize = 9;
    else if(diff === 'NORMAL') state.gridSize = 8;
    else state.gridSize = 7; // HARD, HELL

    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}

export function checkAdmin(name) {
    if(name === 'tony' || name === 'admin') { 
        state.isAdmin = true; 
        return true; 
    }
    state.isAdmin = false; 
    return false;
}
