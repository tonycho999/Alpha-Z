// js/game-audio.js

export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        // 소리 파일 로드
        this.sounds = {
            drop: new Audio('assets/drop.mp3'),
            merge: new Audio('assets/merge.mp3'),
            over: new Audio('assets/over.mp3'),
            click: new Audio('assets/drop.mp3') // 버튼 클릭음 (drop 재사용)
        };

        // 초기 음량 설정
        Object.values(this.sounds).forEach(s => {
            s.volume = 0.5; // 너무 시끄럽지 않게 50%
        });

        // 저장된 설정 불러오기
        const savedMute = localStorage.getItem('alpha_muted');
        if (savedMute === 'true') {
            this.isMuted = true;
            this.updateIcon();
        }
    },

    play(name) {
        if (this.isMuted || !this.sounds[name]) return;
        
        // 끊김 없이 연속 재생을 위해 cloneNode 사용 (또는 currentTime=0)
        const sound = this.sounds[name];
        sound.currentTime = 0; 
        
        // 합쳐지는 소리는 약간 톤을 높여도 좋음 (여기선 기본 재생)
        sound.play().catch(e => console.log('Audio play failed', e));
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('alpha_muted', this.isMuted);
        this.updateIcon();
        return this.isMuted;
    },

    updateIcon() {
        const btn = document.getElementById('btn-sound');
        if (btn) {
            // 이모지 변경 (🔊 / 🔇)
            btn.textContent = this.isMuted ? '🔇' : '🔊';
            btn.style.opacity = this.isMuted ? '0.5' : '1';
        }
    }
};
