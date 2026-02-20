// js/game-audio.js

export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        // [중요] 파일명 대소문자까지 정확해야 합니다!
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            // assets 폴더가 index.html과 같은 위치에 있어야 함
            const path = `assets/${name}.mp3`;
            const audio = new Audio(path);
            
            // 로드 성공 시 로그
            audio.addEventListener('canplaythrough', () => {
                // console.log(`✅ Loaded: ${path}`);
            });

            // 로드 실패 시 로그 (이게 뜨면 파일 경로 문제)
            audio.addEventListener('error', (e) => {
                console.error(`❌ FILE MISSING: ${path} (Check folder name & file name)`);
            });

            this.sounds[name] = audio;
        });

        // drop 소리가 없으면 click 소리도 안 남 -> 안전장치
        this.sounds['click'] = this.sounds['drop'] || new Audio();

        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    setupGlobalClicks() {
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, a, .hand-slot');
            if (target && target.id !== 'btn-sound') {
                this.play('click');
            }
        }, true);
    },

    play(name) {
        if (this.isMuted) return;
        
        const sound = this.sounds[name];
        if (!sound) {
            // 파일 자체가 로드 안 된 경우
            return;
        }

        try {
            // 소리가 겹쳐도 나게 하기 위해 복제
            const clone = sound.cloneNode(true);
            clone.volume = 0.5;
            
            const promise = clone.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    // 브라우저가 막은 경우는 조용히 무시 (화면 터치 전)
                });
            }
        } catch (e) {
            console.error("Audio Play Error:", e);
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
