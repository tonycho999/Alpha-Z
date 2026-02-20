export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            const audio = new Audio(`assets/${name}.mp3`);
            audio.addEventListener('error', (e) => {
                console.error(`❌ Audio load failed: assets/${name}.mp3`, e);
            });
            this.sounds[name] = audio;
        });

        // 'click'이라는 이름으로 'drop' 소리를 같이 씁니다.
        // (파일을 또 로드할 필요 없이 drop을 참조)
        this.sounds['click'] = this.sounds['drop']; 

        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
        }
        this.updateIcon();
    },

    // [추가] 화면의 모든 버튼에 클릭 소리 자동 적용
    setupGlobalClicks() {
        document.addEventListener('click', (e) => {
            // 클릭한 요소가 버튼이거나, 버튼 안에 있는 글자/아이콘인지 확인
            // <button>, .btn 클래스, <a> 태그 등을 모두 포함
            const target = e.target.closest('button, .btn, a');
            
            // 버튼이고, 사운드 토글 버튼(얘는 따로 처리함)이 아니면 소리 재생
            if (target && target.id !== 'btn-sound') {
                this.play('click');
            }
        });
    },

    play(name) {
        if (this.isMuted) return;
        
        const originalSound = this.sounds[name];
        if (!originalSound) return;

        // 연속 클릭을 위해 소리 복제해서 재생
        const soundClone = originalSound.cloneNode(true);
        soundClone.volume = 0.5;
        
        soundClone.play().catch(e => {
            // 사용자 인터랙션 전 자동 재생 방지 에러는 무시
        });
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
