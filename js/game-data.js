export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 블록 모양 정의 (누락 없이 전체 포함)
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

// 로컬스토리지 안전 로드 헬퍼
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
    
    // [중요] best: 역대 최고, currentMax: 이번 판 최고 (A 등장을 위해 필수)
    best: localStorage.getItem('alpha_best') || 'A',
    currentMax: 'A', 
    
    isLocked: false, 
    isReviveTurn: false, 
    hasRevived: false,
    isAdmin: localStorage.getItem('alpha_admin') === 'true',
    diff: 'NORMAL', 
    isHammerMode: false
};

// 관리자 체크 함수
export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        state.isAdmin = true;
        return true;
    }
    return false;
}

// [광고 관리자] 쿨타임(10분) & 횟수제한(10회) 로직 포함
export const AdManager = {
    COOLDOWN: 10 * 60 * 1000, // 10분
    DAILY_LIMIT: 10,          // 하루 10회

    checkAdStatus: function() {
        if (state.isAdmin) return { avail: true, msg: 'Admin' };

        const now = Date.now();
        const lastTime = parseInt(localStorage.getItem('alpha_ad_last') || 0);
        const count = parseInt(localStorage.getItem('alpha_ad_cnt') || 0);
        const lastDate = localStorage.getItem('alpha_ad_date') || '';
        const today = new Date().toDateString();

        // 날짜가 바뀌었으면 횟수 초기화
        if(lastDate !== today) {
            localStorage.setItem('alpha_ad_cnt', 0);
            localStorage.setItem('alpha_ad_date', today);
            return { avail: true, msg: '' };
        }

        // 제한 확인
        if(count >= this.DAILY_LIMIT) return { avail: false, msg: 'Daily Limit (10/10)' };
        
        // 쿨타임 확인
        if(now - lastTime < this.COOLDOWN) {
            const leftMin = Math.ceil((this.COOLDOWN - (now - lastTime)) / 60000);
            return { avail: false, msg: `Wait ${leftMin}m` };
        }
        return { avail: true, msg: '' };
    },

    recordWatch: function() {
        if (state.isAdmin) return;
        const count = parseInt(localStorage.getItem('alpha_ad_cnt') || 0);
        localStorage.setItem('alpha_ad_last', Date.now());
        localStorage.setItem('alpha_ad_cnt', count + 1);
        localStorage.setItem('alpha_ad_date', new Date().toDateString());
    },

    showRewardAd: function(onSuccess) {
        const status = this.checkAdStatus();
        
        if (state.isAdmin) { 
            alert("👑 Admin Pass: Reward Granted"); 
            onSuccess(); 
            return; 
        }
        
        if (!status.avail) { 
            alert(`🚫 Cannot watch ad.\n${status.msg}`); 
            return; 
        }

        if(confirm("📺 Watch Ad to get reward?")) {
            window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
            // 3초 후 보상 지급 및 쿨타임 기록
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
