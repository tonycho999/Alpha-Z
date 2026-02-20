// js/game-data.js

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 1칸짜리 블록
export const SHAPES_1 = [
    { id: '1a', map: [[0,0]], w:1, h:1 }
];

// 2칸짜리 블록
export const SHAPES_2 = [
    { id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, // 가로
    { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }  // 세로
];

// 3칸짜리 블록
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
    
    // 3개 슬롯
    hand: [null, null, null], 
    dragIndex: -1,
    
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
    nextBlock: null 
};

// [수정됨] AdManager에 canWatchAd 추가 (shop.js 오류 해결)
export const AdManager = {
    // 광고 시청 가능 여부 체크 (항상 true로 반환하여 버튼 활성화)
    canWatchAd: function() {
        return true; 
    },

    // 광고 보기 시뮬레이션
    showRewardAd: function(onSuccess) {
        if(confirm("📺 Watch Ad to get reward? (Simulated)")) {
            onSuccess();
        }
    }
};

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
