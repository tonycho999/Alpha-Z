export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const SHAPES = [
    { w:3, h:1, map:[[0,0],[0,1],[0,2]] }, // ㅡ
    { w:1, h:3, map:[[0,0],[1,0],[2,0]] }, // ㅣ
    { w:2, h:2, map:[[0,0],[1,0],[1,1]] }, // ㄴ
    { w:2, h:2, map:[[0,0],[0,1],[1,0]] }, // ㄱ
    { w:2, h:2, map:[[0,0],[0,1],[1,1]] }, // ㄱ반대
    { w:2, h:2, map:[[0,1],[1,1],[1,0]] }, // ㄴ반대
];

export const state = {
    grid: Array(25).fill(null),
    stars: 0,
    best: 'A',
    diff: 'NORMAL',
    currentBlock: null,
    nextBlock: null,
    isLocked: false 
};

export function resetState() {
    state.grid = Array(25).fill(null);
    state.isLocked = false;
}
