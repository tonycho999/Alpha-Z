import { state, initGridSize, checkAdmin } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import "./game-items.js"; 
import { AudioMgr } from "./game-audio.js"; 

// [핵심 수정] 초기화 순서: 오디오 해제 -> 데이터 설정 -> 화면 그리기
window.initGame = (diff) => {
    // 1. [최우선] 오디오 잠금 해제
    // 사용자의 클릭 이벤트(call stack)가 살아있을 때 즉시 실행해야 함
    if (AudioMgr.resumeContext) {
        AudioMgr.resumeContext();
    }

    // 2. 데이터 설정
    state.diff = diff || 'NORMAL';
    initGridSize(state.diff);
    
    // 3. 화면 그리기 (비동기 처리)
    // HTML의 'hidden' 클래스가 제거되고 화면이 실제로 렌더링된 '다음 프레임'에
    // 그리드를 그려야 사이즈 계산(getBoundingClientRect)이 정확하게 됨
    requestAnimationFrame(() => {
        // 그리드 생성
        UI.renderGrid();
        
        // 게임 로직 시작 (핸드 채우기)
        Flow.checkHandAndRefill();
        
        // UI 업데이트
        UI.updateUI();
    });
};

window.onload = () => {
    // 1. 오디오 파일 로드
    AudioMgr.init();
    
    // 2. 전역 클릭 사운드 설정 (버튼 클릭음)
    // 화면의 아무 버튼이나 누르면 소리가 나도록 이벤트 등록
    AudioMgr.setupGlobalClicks();

    // 3. 사운드 토글 버튼 연결
    const soundBtn = document.getElementById('btn-sound');
    if(soundBtn) {
        soundBtn.onclick = () => AudioMgr.toggleMute();
    }

    // 4. 데이터 로드 (별 개수 등)
    if(state.isAdmin) state.stars = 10000;
    else state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    UI.updateUI();

    // 5. 저장 버튼 이벤트 연결 (신규/기존 유저)
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
