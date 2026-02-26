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
    isAdmin: localStorage.getItem('alpha_admin') === 'true',
    diff: 'NORMAL', 
    isHammerMode: false,
    
    // [추가] 부활 관련 상태 (로직에서 사용됨)
    hasRevived: false 
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

// [AdManager: 하이브리드 광고 관리자]
export const AdManager = {
    platform: 'GENERIC', // 기본값: 일반 웹 (링크 광고)
    crazysdk: null,      // 크레이지게임즈 객체 저장용

    // 1. 게임 시작 시 플랫폼 감지 및 초기화
    init: async function() {
        // (A) Poki 감지
        if (window.PokiSDK) {
            console.log("🎮 Platform Detected: POKI");
            this.platform = 'POKI';
            try {
                await window.PokiSDK.init();
                window.PokiSDK.gameLoadingFinished();
            } catch (e) { 
                console.log("Poki Init Fail (Adblock?)", e); 
                // 실패해도 게임은 계속 진행되어야 함
                this.platform = 'GENERIC'; 
            }
            return;
        }

        // (B) CrazyGames 감지
        if (window.CrazyGames) {
            console.log("🎮 Platform Detected: CRAZYGAMES");
            this.platform = 'CRAZY';
            this.crazysdk = window.CrazyGames.SDK;
            return;
        }

        // (C) 그 외: 일반 웹 (제공해주신 링크 사용)
        console.log("🎮 Platform Detected: GENERIC (Direct Link)");
        this.platform = 'GENERIC';
    },

    // 2. 보상형 광고 보여주기 (플랫폼별 분기 처리)
    showRewardAd: function(onSuccess) {
        // 관리자면 프리패스
        if (state.isAdmin) {
            console.log("👑 Admin Pass");
            onSuccess(); return;
        }

        console.log(`📺 Show Ad Request: [${this.platform}]`);

        // [CASE 1] Poki 광고
        if (this.platform === 'POKI') {
            window.PokiSDK.rewardedBreak((success) => {
                if(success) {
                    console.log("Poki Ad Success");
                    onSuccess();
                } else {
                    console.log("Poki Ad Skipped or Failed");
                    // 유저가 닫았을 때 처리는 기획에 따라 다름 (보통 안 줌)
                    // 여기서는 유저 편의를 위해 알림만 띄우거나 그냥 둠
                }
            });
        }
        
        // [CASE 2] CrazyGames 광고
        else if (this.platform === 'CRAZY' && this.crazysdk) {
            this.crazysdk.requestAd('rewarded', {
                adStarted: () => console.log('Crazy Ad Start'),
                adError: (error) => {
                    console.log('Crazy Ad Error', error);
                    onSuccess(); // 에러 발생 시 유저 이탈 방지를 위해 보상 지급
                },
                adFinished: () => {
                    console.log('Crazy Ad Finish');
                    onSuccess(); // [수정됨] 중복 정의 제거하고 여기서 보상 지급
                }
            });
        }
        
        // [CASE 3] 일반 링크 광고
        else {
            if(confirm("📺 Watch Ad to support us?")) {
                const adUrl = 'https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb';
                
                // 모바일 팝업 차단 방지를 위해 링크 생성 클릭 방식 사용
                const link = document.createElement('a');
                link.href = adUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                    if(document.body.contains(link)) document.body.removeChild(link);
                }, 100);

                // 3초 후 보상 지급 (광고 보고 왔다고 가정)
                setTimeout(() => { onSuccess(); }, 3000);
            }
        }
    }
};
