// js/game-audio.js
export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        // [사용자님 코드 원복] 단순하고 확실한 방법
        this.sounds = {
            drop: new Audio('assets/drop.mp3'),
            merge: new Audio('assets/merge.mp3'),
            over: new Audio('assets/over.mp3')
        };

        // 초기 음량 설정 (0.5)
        Object.values(this.sounds).forEach(s => {
            s.volume = 0.5; 
            // 모바일에서 지연 없이 재생되도록 미리 로드 설정
            s.preload = 'auto';
        });

        // [추가] 버튼 클릭 소리는 'drop' 소리를 재사용
        this.sounds['click'] = this.sounds['drop'];

        // 저장된 설정 불러오기
        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    // [추가된 기능] 화면의 모든 버튼 클릭 감지 (이게 있어야 버튼 소리가 남)
    setupGlobalClicks() {
        document.addEventListener('click', (e) => {
            // 클릭한 요소가 버튼, 링크, 혹은 핸드 슬롯인지 확인
            const target = e.target.closest('button, .btn, a, .hand-slot');
            
            // 소리 버튼이 아니고, 클릭 가능한 요소라면 소리 재생
            if (target && target.id !== 'btn-sound') {
                this.play('click');
            }
        });
    },

    play(name) {
        if (this.isMuted || !this.sounds[name]) return;
        
        const sound = this.sounds[name];
        
        // [수정] 복제 대신 시간 초기화 방식 (가장 안정적)
        try {
            sound.currentTime = 0;
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // 사용자가 아직 화면을 터치하지 않았을 때 발생하는 에러는 무시
                    // console.log('Audio play prevented');
                });
            }
        } catch(e) {
            console.error(e);
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('alpha_muted', this.isMuted);
        this.updateIcon();
        // 켤 때 확인음 재생
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
