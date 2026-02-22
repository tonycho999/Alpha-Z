export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SHAPES_1 = [{ id: '1a', map: [[0,0]], w:1, h:1 }];
export const SHAPES_2 = [
    { id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, 
    { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }
];
export const SHAPES_3 = [ 
    { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, 
    { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, 
    { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, 
    { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, 
    { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, 
    { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 } 
];

function safeLoad(key, defaultVal) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultVal;
    } catch(e) { return defaultVal; }
}

export const state = {
    gridSize: 8, 
    grid: [], 
    hand: [null, null, null], 
    dragIndex: -1,
    score: parseInt(localStorage.getItem('alpha_score')) || 0,
    stars: parseInt(localStorage.getItem('alpha_stars')) || 0,
    items: safeLoad('alpha_items', { refresh:0, hammer:0, upgrade:0 }),
    best: 'A', 
    currentMax: 'A', 
    isLocked: false, 
    isReviveTurn: false, 
    hasRevived: false,
    isAdmin: localStorage.getItem('alpha_admin') === 'true',
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

// [AdManager: 관리자 패스 + 10분 쿨타임 + PWA 외부 브라우저]
export const AdManager = {
    COOLDOWN: 10 * 60 * 1000, // 10분

    checkAdStatus: function() {
        if (state.isAdmin) return { avail: true, msg: 'Admin' };

        const now = Date.now();
        const lastTime = parseInt(localStorage.getItem('alpha_ad_last') || 0);
        
        if(now - lastTime < this.COOLDOWN) {
            const leftMin = Math.ceil((this.COOLDOWN - (now - lastTime)) / 60000);
            return { avail: false, msg: `Wait ${leftMin}m` };
        }
        return { avail: true, msg: '' };
    },

    recordWatch: function() {
        if (state.isAdmin) return;
        localStorage.setItem('alpha_ad_last', Date.now());
    },

    showRewardAd: function(onSuccess) {
        // [1. 관리자 프리패스: 광고 없이 즉시 성공]
        if (state.isAdmin) {
            // console.log("👑 Admin Pass");
            onSuccess();
            return;
        }

        const status = this.checkAdStatus();
        
        // [2. 쿨타임 패스: 쿨타임 중이면 광고 없이 성공 (기능 유지)]
        if (!status.avail) {
            onSuccess(); 
            return;
        }

        // [3. 일반 유저 광고 시청]
        if(confirm("📺 Watch Ad to support us?")) {
            const adUrl = 'https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb';
            
            const link = document.createElement('a');
            link.href = adUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => { 
                this.recordWatch(); 
                onSuccess(); 
            }, 3000);
        }
    }
};

export function initGridSize(diff) {
    if (diff === 'EASY') state.gridSize = 9;
    else if (diff === 'NORMAL') state.gridSize = 8;
    else if (diff === 'HARD' || diff === 'HELL') state.gridSize = 7;
    else state.gridSize = 8;
    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}
