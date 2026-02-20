export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            // [경로 설정] assets 폴더가 index.html과 같은 위치에 있어야 함
            const audio = new Audio(`assets/${name}.mp3`);
            audio.volume = 0.5;

            audio.addEventListener('error', (e) => {
                console.error(`❌ Audio load failed: assets/${name}.mp3`, e);
            });

            this.sounds[name] = audio;
        });

        // 클릭음은 drop 소리 재사용
        this.sounds['click'] = this.sounds['drop'];

        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    // [핵심 해결] 이 함수가 없어서 에러가 났었습니다. 추가해주세요!
    resumeContext() {
        // 브라우저의 오디오 정책을 풀기 위해 빈 소리를 한 번 재생 시도
        try {
            if (this.sounds['drop']) {
                const dummy = this.sounds['drop'];
                const originalVol = dummy.volume;
                
                dummy.volume = 0; // 소리 안 나게
                const p = dummy.play();
                if (p !== undefined) {
                    p.then(() => {
                        dummy.pause();
                        dummy.currentTime = 0;
                        dummy.volume = originalVol;
                    }).catch(() => {});
                }
            }
        } catch(e) {
            console.log("Audio resume skipped");
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
        if (!audio) return;

        try {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // console.log("Play blocked (interaction needed)");
                });
            }
        } catch (e) {
            console.error("Play error:", e);
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('alpha_muted', this.isMuted);
        this.updateIcon();
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
