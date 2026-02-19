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

export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun'];
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
    else state.gridSize = 7; // HARD, HELL
    
    state.grid = Array(state.gridSize * state.gridSize).fill(null);
    document.documentElement.style.setProperty('--grid-size', state.gridSize);
    state.isAdmin = localStorage.getItem('alpha_admin') === 'true';
}
