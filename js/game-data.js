export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// 크기별 막대 모양
export const SHAPES_1 = [ {w:1, h:1, map:[[0,0]]} ];
export const SHAPES_2 = [ {w:2, h:1, map:[[0,0],[0,1]]}, {w:1, h:2, map:[[0,0],[1,0]]} ];
export const SHAPES_3 = [
    { w:3, h:1, map:[[0,0],[0,1],[0,2]] }, { w:1, h:3, map:[[0,0],[1,0],[2,0]] },
    { w:2, h:2, map:[[0,0],[1,0],[1,1]] }, { w:2, h:2, map:[[0,0],[0,1],[1,0]] },
    { w:2, h:2, map:[[0,0],[0,1],[1,1]] }, { w:2, h:2, map:[[0,1],[1,1],[1,0]] }
];

export const state = {
    grid: [], gridSize: 6,
    stars: 0, best: 'A', diff: 'NORMAL',
    currentBlock: null, nextBlock: null,
    isLocked: false, isHammerMode: false
};

export function initGridSize(diff) {
    // 초보, 중수 = 7x7 / 고수, 극악 = 6x6
    state.gridSize = (diff === 'EASY' || diff === 'NORMAL') ? 7 : 6;
    state.grid = Array(state.gridSize * state.gridSize).fill(null);
    document.documentElement.style.setProperty('--grid-size', state.gridSize);
}
