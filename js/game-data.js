export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const SHAPES_1 = [{ id: '1a', map: [[0,0]], w:1, h:1 }];
export const SHAPES_2 = [{ id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }];
export const SHAPES_3 = [ { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 } ];

// 안전한 로컬스토리지 로드
function safeLoad(key, def) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : def;
    } catch(e) { return def; }
}

export const state = {
    gridSize: 8, 
    grid: [], 
    hand: [null, null, null], 
    dragIndex: -1,
    score: parseInt(localStorage.getItem('alpha_score')) || 0,
    stars: parseInt(localStorage.getItem('alpha_stars')) || 0,
    items: safeLoad('alpha_items', { refresh:0, hammer:0, upgrade:0 }),
    best: localStorage.getItem('alpha_best') || 'A',
    isLocked: false, 
    isAdmin: false, 
    diff: 'NORMAL', 
    isHammerMode: false
};

export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        state.isAdmin = true;
        return true;
    }
    return false;
}

export const AdManager = {
    showRewardAd: function(onSuccess) {
        const isAdminLocal = localStorage.getItem('alpha_admin') === 'true';
        // 관리자는 광고 스킵
        if(state.isAdmin || isAdminLocal) {
            alert("👑 Admin Pass: Reward Granted.");
            onSuccess(); 
            return;
        }
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
    
    // 그리드 재설정
    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}
