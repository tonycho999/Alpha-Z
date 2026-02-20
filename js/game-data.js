// js/game-data.js

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// [핵심] 블록 모양 데이터 (이게 없으면 게임이 멈춥니다)
// 1칸짜리 블록
export const SHAPES_1 = [
    { id: '1a', map: [[0,0]], w:1, h:1 }
];

// 2칸짜리 블록 (가로, 세로)
export const SHAPES_2 = [
    { id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, // 가로
    { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }  // 세로
];

// 3칸짜리 블록 (일자, ㄱ자)
export const SHAPES_3 = [
    { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, // 가로 3
    { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, // 세로 3
    { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, // ㄱ (top-left)
    { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, // ㄴ (bottom-left)
    { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, // r (top-right)
    { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 }  // ㅢ (역ㄱ) - 수정됨
];
// (필요하다면 4칸, 5칸짜리도 추가 가능)

export const state = {
    gridSize: 8,      // 기본값
    grid: [],         // 보드 상태 (null 또는 'A', 'B'...)
    
    hand: [null, null, null], // 하단 3개 블록
    dragIndex: -1,    // 현재 드래그 중인 핸드 슬롯 번호
    
    score: 0,
    stars: 0,
    best: 'A',
    
    isLocked: false,     // 애니메이션 중 조작 잠금
    isReviveTurn: false, // 부활 모드인지
    hasRevived: false,   // 부활 사용 여부
    hasReachedO: false,  // O 달성 여부
    
    isAdmin: false,
    diff: 'NORMAL',
    
    isHammerMode: false,
    nextBlock: null // (구버전 호환용, 안씀)
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
