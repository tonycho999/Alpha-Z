export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            // [경로] ./assets/ 로 통일
            const audio = new Audio(`./assets/${name}.mp3`);
            audio.volume = 0.5;

            // 디버깅용 로그
            audio.addEventListener('error', (e) => {
                console.error(`❌ Audio Not Found: ./assets/${name}.mp3`, e);
            });

            this.sounds[name] = audio;
        });

        this.sounds['click'] = this.sounds['drop'];

        const savedMute = localStorage.getItem('alpha_muted');
        this.isMuted = (savedMute === 'true');
        this.updateIcon();
    },

    // 게임 시작 시 오디오 엔진 깨우기
    resumeContext() {
        if(this.sounds['drop']) {
            const dummy = this.sounds['drop'];
            const originalVol = dummy.volume;
            
            dummy.volume = 0; // 소리 끄고
            dummy.play().then(() => {
                dummy.pause();
                dummy.currentTime = 0;
                dummy.volume = originalVol; // 볼륨 복구
            }).catch(() => {});
        }
    },

    setupGlobalClicks() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, a, .hand-slot');
            if (target && target.id !== 'btn-sound') {
                this.play('click');
            }
        });
    },

    play(name) {
        if (this.isMuted) return;
        const audio = this.sounds[name];
        if (audio) {
            try {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } catch(e) {}
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('alpha_muted', this.isMuted);
        this.updateIcon();
        if(!this.isMuted) this.play('click');
    },

    updateIcon() {
        const btn = document.getElementById('btn-sound');
        if (btn) {
            btn.textContent = this.isMuted ? '🔇' : '🔊';
            btn.style.opacity = this.isMuted ? '0.5' : '1';
        }
    }
};
