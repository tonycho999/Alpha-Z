// js/game-main.js
import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [중요] HTML 버튼에서 스피커를 누를 수 있게 전역 함수로 연결
window.toggleSound = () => {
    AudioMgr.toggleMute();
};

// [핵심 로직] 게임 초기화 함수
window.initGame = (diff) => {
    // 1. [최우선] 사용자 클릭 직후 오디오 잠금 해제 시도
    if (AudioMgr.resumeContext) {
        AudioMgr.resumeContext();
    }

    // 2. 데이터 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // 3. 화면 그리기 (비동기 처리)
    // HTML의 'hidden' 클래스가 제거되고 화면이 렌더링된 '다음 프레임'에 실행
    requestAnimationFrame(() => {
        // 그리드 생성 (이때 컨테이너 크기가 잡혀 있어야 함)
        UI.renderGrid();
        
        // 게임 로직 시작 (핸드 채우기)
        Flow.checkHandAndRefill();
        
        // UI 업데이트
        UI.updateUI();
    });
};

window.onload = () => {
    // 1. 오디오 시스템 초기화
    AudioMgr.init();
    
    // 2. 전역 클릭 사운드 설정 (모든 버튼 클릭 시 소리)
    AudioMgr.setupGlobalClicks();

    // 3. 데이터 로드
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    UI.updateUI();

    // 4. 저장 버튼 이벤트 연결 (신규/기존 유저)
    const btnCheckSave = document.getElementById('btn-check-save');
    if (btnCheckSave) {
        btnCheckSave.onclick = async () => {
            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            if(!name) return alert('Enter username!');
            
            checkAdmin(name);
            const res = await Core.saveScoreToDB(name, true);
            
            if(res.success) {
                document.getElementById('area-new-user').style.display='none';
                document.getElementById('save-msg').style.display='block';
                UI.updateUI();
            } else {
                alert(res.msg);
            }
        };
    }

    const btnJustSave = document.getElementById('btn-just-save');
    if (btnJustSave) {
        btnJustSave.onclick = () => {
            Core.saveScoreToDB(localStorage.getItem('alpha_username'), false);
            document.getElementById('area-exist-user').style.display='none';
            document.getElementById('save-msg').style.display='block';
        };
    }
};
