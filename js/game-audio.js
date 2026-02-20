// js/game-audio.js

export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            const audio = new Audio(`assets/${name}.mp3`);
            // 로드 실패 시 에러 로그
            audio.addEventListener('error', (e) => {
                console.error(`❌ Audio load failed: assets/${name}.mp3`, e);
            });
            this.sounds[name] = audio;
        });

        // [안전 장치] 'drop' 소리가 로드되면 'click'에도 할당
        // drop 소리가 없으면 빈 Audio 객체라도 넣어서 에러 방지
        this.sounds['click'] = this.sounds['drop'] || new Audio();

        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    // [핵심 수정] 캡처링(Capture) 모드로 클릭 감지
    setupGlobalClicks() {
        // 세 번째 인자 'true'가 핵심입니다. (이벤트 캡처링)
        // 다른 스크립트가 클릭 이벤트를 막아도, 여기서 먼저 감지하고 소리를 냅니다.
        document.body.addEventListener('click', (e) => {
            // 클릭된 요소가 버튼(.btn, button, a) 혹은 그 내부 요소인지 확인
            const target = e.target.closest('button, .btn, a, .cell');
            
            // 1. 타겟이 존재하고
            // 2. 사운드 토글 버튼이 아니고 (걔는 별도 소리 없음)
            // 3. 게임 보드판의 셀(cell)이 아니면 (셀은 drop 소리가 따로 나므로 중복 방지)
            if (target && target.id !== 'btn-sound' && !target.classList.contains('cell')) {
                // console.log('🖱️ Button clicked!', target); // 디버깅용 로그
                this.play('click');
            }
        }, true); 
    },

    play(name) {
        if (this.isMuted) return;
        
        const originalSound = this.sounds[name];
        if (!originalSound) {
            console.warn(`⚠️ Sound not found: ${name}`);
            return;
        }

        // 소리 복제 후 재생 (연속 클릭 대응)
        try {
            const soundClone = originalSound.cloneNode(true);
            soundClone.volume = 0.5;
            
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 브라우저 정책으로 막힌 경우 (화면 터치 전)
                    // console.log('🔇 Play blocked: User interaction needed.');
                });
            }
        } catch (e) {
            console.error("Audio play error:", e);
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('alpha_muted', this.isMuted);
        this.updateIcon();
        // 음소거 해제 시 피드백 소리 재생
        if (!this.isMuted) this.play('click');
    },

    updateIcon() {
        const btn = document.getElementById('btn-sound');
        if (btn) {
            btn.textContent = this.isMuted ? '🔇' : '🔊';
            btn.style.opacity = this.isMuted ? '0.5' : '1';
        }
    }
};
