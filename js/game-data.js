export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SHAPES_1 = [{ id: '1a', map: [[0,0]], w:1, h:1 }];
export const SHAPES_2 = [{ id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }];
export const SHAPES_3 = [ { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 } ];

// 초기 상태 (localStorage에서 안전하게 로드)
const savedItems = localStorage.getItem('alpha_items');
const parsedItems = savedItems ? JSON.parse(savedItems) : { refresh:0, hammer:0, upgrade:0 };

export const state = {
    gridSize: 8, grid: [], hand: [null, null, null], dragIndex: -1,
    score: parseInt(localStorage.getItem('alpha_score')) || 0, // 점수도 로컬 로드
    stars: parseInt(localStorage.getItem('alpha_stars')) || 0,
    items: parsedItems,
    best: localStorage.getItem('alpha_best') || 'A',
    isLocked: false, isReviveTurn: false, hasRevived: false,
    isAdmin: false, diff: 'NORMAL', isHammerMode: false
};

// [관리자 체크]
export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        state.isAdmin = true;
        return true;
    }
    return false;
}

// [광고 관리자 - 관리자 스킵 적용]
export const AdManager = {
    showRewardAd: function(onSuccess) {
        const isAdminLocal = localStorage.getItem('alpha_admin') === 'true';
        // 관리자면 즉시 보상
        if(state.isAdmin || isAdminLocal) {
            alert("👑 Admin Pass: Reward Granted.");
            onSuccess(); 
            return;
        }
        // 일반 유저
        if(confirm("📺 Watch Ad to get reward?")) {
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            setTimeout(() => { onSuccess(); }, 3000);
        }
    }
};

export function initGridSize(diff) {
    if (diff === 'EASY') state.gridSize = 9;
    else if (diff === 'NORMAL') state.gridSize = 8;
    else if (diff === 'HARD') state.gridSize = 7;
    else if (diff === 'HELL') state.gridSize = 7;
    else state.gridSize = 8;
    // 그리드 초기화 (이미 데이터가 있으면 덮어쓰지 않도록 주의해야 함, 여기선 사이즈 변경시만 초기화)
    if(state.grid.length !== state.gridSize * state.gridSize) {
         state.grid = new Array(state.gridSize * state.gridSize).fill(null);
    }
}
