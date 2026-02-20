export const AudioMgr = {
    isMuted: false,
    sounds: {},
    audioCtx: null, // 웹 오디오 컨텍스트 (필요시 사용)

    init() {
        // [수정] ./ (점 슬래시)를 사용하여 현재 폴더 기준 assets를 찾음
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            const path = `./assets/${name}.mp3`; // 상대 경로로 변경
            const audio = new Audio(path);
            audio.preload = 'auto'; // 미리 로드
            
            audio.addEventListener('error', (e) => {
                console.warn(`⚠️ Audio not found: ${path}`);
            });
            this.sounds[name] = audio;
        });

        // 클릭음 연결
        this.sounds['click'] = this.sounds['drop'];

        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    // [추가] 브라우저가 오디오를 막았을 때 뚫어주는 함수
    resumeContext() {
        // HTML5 Audio 태그 방식은 특별한 resume이 필요 없지만,
        // 사용자 인터랙션 직후에 빈 소리를 한 번 재생해서 깨워줌
        if(this.sounds['click']) {
            const dummy = this.sounds['click'].cloneNode(true);
            dummy.volume = 0;
            dummy.play().catch(e => {}); 
        }
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
        if (!sound) return;

        // 소리가 겹치도록 복제해서 재생
        try {
            const clone = sound.cloneNode(true);
            clone.volume = 0.5;
            const playPromise = clone.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 아직 사용자가 화면을 터치하지 않아서 막힌 경우 (정상)
                    // console.log("Audio autoplay blocked");
                });
            }
        } catch (e) {
            // 무시
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
