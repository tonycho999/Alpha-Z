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
    gridSize: 8, 
    grid: [], 
    hand: [null, null, null], 
    dragIndex: -1,
    score: 0, 
    // [수정] 초기화 시 로컬 스토리지 값 확인
    stars: parseInt(localStorage.getItem('alpha_stars')) || 0, 
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

// [관리자 체크]
export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        // 별 10000개 지급
        localStorage.setItem('alpha_stars', '10000');
        state.stars = 10000; 
        state.isAdmin = true;
        return true;
    }
    return false;
}

// [광고 관리자]
export const AdManager = {
    // 광고 시청 가능 여부
    canWatchAd: function() { return true; },

    // 보상형 광고 로직
    showRewardAd: function(onSuccess) {
        // 1. 관리자 여부 확인
        const isAdminLocal = localStorage.getItem('alpha_admin') === 'true';
        
        if(state.isAdmin || isAdminLocal) {
            // [관리자] 광고 창 띄우지 않고 성공 처리
            alert("👑 Admin Pass: 광고 없이 보상을 획득합니다.");
            onSuccess(); 
            return;
        }

        // 2. 일반 유저
        if(confirm("📺 Watch Ad to get reward?")) {
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            // 3초 후 보상 지급 시뮬레이션
            setTimeout(() => {
                onSuccess();
            }, 3000);
        }
    }
};

// [수정됨] 난이도별 그리드 크기 설정 (HARD, HELL 명시)
export function initGridSize(diff) {
    if (diff === 'EASY') {
        state.gridSize = 9; // 쉬움: 9x9 (넓음)
    } 
    else if (diff === 'NORMAL') {
        state.gridSize = 8; // 보통: 8x8
    } 
    else if (diff === 'HARD') {
        state.gridSize = 7; // 어려움: 7x7 (좁음)
    } 
    else if (diff === 'HELL') {
        state.gridSize = 7; // 지옥: 7x7 (크기는 같지만 블록 확률이 다름)
    } 
    else {
        state.gridSize = 8; // 기본값 안전장치
    }

    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}
