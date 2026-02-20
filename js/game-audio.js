// js/game-audio.js

export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        // [사용자님 요청 코드 적용] 가장 단순하고 확실한 방법
        fileNames.forEach(name => {
            const audio = new Audio(`assets/${name}.mp3`);
            audio.volume = 0.5; // 볼륨 50%
            
            // 로드 에러 확인용 (경로가 틀리면 콘솔에 뜸)
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

    // [버튼 소리 해결] 화면의 아무 곳이나 클릭하면 체크
    setupGlobalClicks() {
        document.addEventListener('click', (e) => {
            // 클릭한 요소가 버튼(.btn), 링크(a), 혹은 핸드 슬롯인지 확인
            const target = e.target.closest('.btn, button, a, .hand-slot');
            
            // 사운드 토글 버튼이 아니고, 뭔가 클릭 가능한 요소라면 소리 재생
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
            // [단순화] 복제하지 않고 기존 오디오를 0초로 돌려서 재생
            // 연속 클릭 시 소리가 씹히는 걸 방지하고 성능도 더 좋음
            audio.currentTime = 0;
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 브라우저가 막은 경우 (아직 화면 터치 안함) -> 에러 아님, 무시
                    // console.log("Autoplay prevented");
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
