export const AudioMgr = {
    isMuted: false,
    sounds: {},

    init() {
        const fileNames = ['drop', 'merge', 'over'];
        
        fileNames.forEach(name => {
            // [핵심 수정] 앞에 / 를 붙여 절대 경로로 변경
            const path = `/assets/${name}.mp3`;
            const audio = new Audio(path);
            
            audio.addEventListener('error', (e) => {
                console.error(`❌ FILE MISSING: ${path}`);
            });
            this.sounds[name] = audio;
        });

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
        if (!sound) return;

        try {
            const clone = sound.cloneNode(true);
            clone.volume = 0.5;
            clone.play().catch(() => {});
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
