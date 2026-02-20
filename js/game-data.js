// js/game-data.js

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SHAPES_1 = [{ id: '1a', map: [[0,0]], w:1, h:1 }];
export const SHAPES_2 = [{ id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }];
export const SHAPES_3 = [
    { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 },
    { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 },
    { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 },
    { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 },
    { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 },
    { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 }
];

export const state = {
    gridSize: 8, grid: [], hand: [null, null, null], dragIndex: -1,
    score: 0, stars: 0, best: 'A',
    isLocked: false, isReviveTurn: false, hasRevived: false, hasReachedO: false,
    isAdmin: false, diff: 'NORMAL', isHammerMode: false, nextBlock: null 
};

// [중요] 광고 관리자 (모든 파일에서 공통으로 사용)
export const AdManager = {
    // 1. 광고 시청 가능 여부 (무조건 가능)
    canWatchAd: function() {
        return true; 
    },

    // 2. 보상형 광고 보기 (샵, 부활)
    showRewardAd: function(onSuccess) {
        if(confirm("📺 Watch Ad to get reward?")) {
            // [사용자님 링크] 새 창으로 광고 열기
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            
            // 3초 후 보상 지급 (시뮬레이션)
            setTimeout(() => {
                onSuccess();
            }, 3000);
        }
    }
};

export function initGridSize(diff) {
    if(diff === 'EASY') state.gridSize = 9;
    else if(diff === 'NORMAL') state.gridSize = 8;
    else state.gridSize = 7; 
    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}

export function checkAdmin(name) {
    if(name === 'tony' || name === 'admin') { state.isAdmin = true; return true; }
    state.isAdmin = false; return false;
}
