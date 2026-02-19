export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const SHAPES_1 = [ {w:1, h:1, map:[[0,0]]} ];
export const SHAPES_2 = [ {w:2, h:1, map:[[0,0],[0,1]]}, {w:1, h:2, map:[[0,0],[1,0]]} ];
export const SHAPES_3 = [
    { w:3, h:1, map:[[0,0],[0,1],[0,2]] }, { w:1, h:3, map:[[0,0],[1,0],[2,0]] },
    { w:2, h:2, map:[[0,0],[1,0],[1,1]] }, { w:2, h:2, map:[[0,0],[0,1],[1,0]] },
    { w:2, h:2, map:[[0,0],[0,1],[1,1]] }, { w:2, h:2, map:[[0,1],[1,1],[1,0]] }
];

export const state = {
    grid: [], gridSize: 7,
    stars: 0, best: 'A', diff: 'NORMAL',
    currentBlock: null, nextBlock: null,
    isLocked: false, isHammerMode: false, isAdmin: false, hasReachedO: false
};

// 광고 시청 시스템 매니저
export const AdManager = {
    canWatchAd() {
        if(state.isAdmin) return { canWatch: true }; 
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('alpha_ad_date');
        let count = parseInt(localStorage.getItem('alpha_ad_count')) || 0;

        if (lastDate !== today) { count = 0; localStorage.setItem('alpha_ad_count', count); }
        if (count >= 10) return { canWatch: false, reason: 'Daily Limit Reached (10/10)' };

        const lastTime = parseInt(localStorage.getItem('alpha_ad_time')) || 0;
        const elapsed = Date.now() - lastTime;
        const cooldown = 10 * 60 * 1000; // 10 minutes

        if (elapsed < cooldown) return { canWatch: false, reason: 'cooldown', remaining: cooldown - elapsed };
        return { canWatch: true };
    },
    recordAdWatch() {
        if(state.isAdmin) return;
        const today = new Date().toDateString();
        let count = parseInt(localStorage.getItem('alpha_ad_count')) || 0;
        if (localStorage.getItem('alpha_ad_date') !== today) count = 0;

        localStorage.setItem('alpha_ad_date', today);
        localStorage.setItem('alpha_ad_count', count + 1);
        localStorage.setItem('alpha_ad_time', Date.now());
    }
};

export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        localStorage.setItem('alpha_stars', '10000');
        state.stars = 10000; state.isAdmin = true;
        return true;
    }
    return false;
}

export function initGridSize(diff) {
    if (diff === 'EASY') state.gridSize = 9;
    else if (diff === 'NORMAL') state.gridSize = 8;
    else state.gridSize = 7; 
    
    state.grid = Array(state.gridSize * state.gridSize).fill(null);
    document.documentElement.style.setProperty('--grid-size', state.gridSize);
    state.isAdmin = localStorage.getItem('alpha_admin') === 'true';
}
