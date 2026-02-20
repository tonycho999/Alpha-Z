// js/game-audio.js

export const AudioMgr = {
    // HTML에 있는 <audio> 태그 ID와 매칭
    playSound(id) {
        // 뮤트 상태 확인
        const isMuted = localStorage.getItem('alpha_muted') === 'true';
        if (isMuted) return;

        // 태그 찾기 (s-drop, s-merge, s-over)
        const el = document.getElementById(`s-${id}`);
        if (el) {
            try {
                el.currentTime = 0; // 재생 위치 초기화
                const p = el.play();
                if(p !== undefined) p.catch(e => {}); // 자동재생 에러 무시
            } catch (e) {
                console.error("Sound Error:", e);
            }
        }
    },

    // 외부에서 부를 이름들 연결
    play(name) {
        if(name === 'click') this.playSound('drop'); // 클릭음은 drop으로 대체
        else this.playSound(name);
    }
};
