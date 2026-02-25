export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 블록 모양 정의
export const SHAPES_1 = [{ id: '1a', map: [[0,0]], w:1, h:1 }];

export const SHAPES_2 = [
    { id: '2h', map: [[0,0], [0,1]], w:2, h:1 }, 
    { id: '2v', map: [[0,0], [1,0]], w:1, h:2 }
];

export const SHAPES_3 = [ 
    { id: '3h', map: [[0,0], [0,1], [0,2]], w:3, h:1 }, 
    { id: '3v', map: [[0,0], [1,0], [2,0]], w:1, h:3 }, 
    { id: '3Lt', map: [[0,0], [0,1], [1,0]], w:2, h:2 }, // ㄱ
    { id: '3Lb', map: [[0,0], [1,0], [1,1]], w:2, h:2 }, // ㄴ
    { id: '3Rt', map: [[0,0], [0,1], [1,1]], w:2, h:2 }, // ㅢ
    { id: '3Rb', map: [[0,0], [1,0], [0,1]], w:2, h:2 }  // r
];

// 안전하게 로컬스토리지 불러오기 (JSON 파싱 에러 방지)
function safeLoad(key, defaultVal) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultVal;
    } catch(e) { return defaultVal; }
}

// [핵심] 게임 상태 (State)
// items 초기화 시 localStorage에서 'alpha_items'를 불러오도록 설정됨
export const state = {
    gridSize: 8, 
    grid: [], 
    hand: [null, null, null], 
    dragIndex: -1,
    score: parseInt(localStorage.getItem('alpha_score')) || 0,
    stars: parseInt(localStorage.getItem('alpha_stars')) || 0,
    
    // [중요] 저장된 아이템이 있으면 불러오고, 없으면 0개로 시작
    items: safeLoad('alpha_items', { refresh:0, hammer:0, upgrade:0 }),
    
    best: localStorage.getItem('alpha_best') || 'A', 
    currentMax: 'A', 
    isLocked: false, 
    isReviveTurn: false, 
    hasRevived: false,
    isAdmin: localStorage.getItem('alpha_admin') === 'true',
    diff: 'NORMAL', 
    isHammerMode: false
};

// 관리자 확인 함수
export function checkAdmin(username) {
    const admins = ['tony', 'min', 'sara', 'hyun', 'madhel'];
    if(username && admins.includes(username.toLowerCase())) {
        localStorage.setItem('alpha_admin', 'true');
        state.isAdmin = true;
        return true;
    }
    return false;
}


// 난이도별 그리드 크기 초기화
export function initGridSize(diff) {
    if (diff === 'EASY') state.gridSize = 9;
    else if (diff === 'NORMAL') state.gridSize = 8;
    else if (diff === 'HARD' || diff === 'HELL') state.gridSize = 7;
    else state.gridSize = 8; // 기본값
    
    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}
