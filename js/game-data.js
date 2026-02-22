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

// [AdManager: 광고 관리 객체]
export const AdManager = {
    COOLDOWN: 10 * 60 * 1000, // 10분 쿨타임

    // 광고 시청 가능 여부 확인
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

    // 광고 시청 기록 저장
    recordWatch: function() {
        if (state.isAdmin) return;
        localStorage.setItem('alpha_ad_last', Date.now());
    },

    // 보상형 광고 실행
    showRewardAd: function(onSuccess) {
        // 1. 관리자 프리패스
        if (state.isAdmin) {
            // console.log("👑 Admin Pass");
            onSuccess();
            return;
        }

        const status = this.checkAdStatus();
        
        // 2. 쿨타임 중이면 광고 없이 성공 처리 (사용자 편의)
        if (!status.avail) {
            onSuccess(); 
            return;
        }

        // 3. 일반 유저 광고 시청 (새 탭으로 열기)
        if(confirm("📺 Watch Ad to support us?")) {
            const adUrl = 'https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb';
            
            // 모바일/PC 호환성을 위해 링크 생성 후 클릭 방식 사용
            const link = document.createElement('a');
            link.href = adUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            
            // 클릭 후 링크 요소 삭제
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);

            // 3초 후 보상 지급 (광고 보고 왔다고 가정)
            setTimeout(() => { 
                this.recordWatch(); 
                onSuccess(); 
            }, 3000);
        }
    }
};

// 난이도별 그리드 크기 초기화
export function initGridSize(diff) {
    if (diff === 'EASY') state.gridSize = 9;
    else if (diff === 'NORMAL') state.gridSize = 8;
    else if (diff === 'HARD' || diff === 'HELL') state.gridSize = 7;
    else state.gridSize = 8; // 기본값
    
    state.grid = new Array(state.gridSize * state.gridSize).fill(null);
}
