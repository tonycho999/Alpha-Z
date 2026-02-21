export const AudioMgr = {
    play: (id) => {
        // HTML ID는 's-drop' 형식이지만 호출은 'drop'으로 함
        const el = document.getElementById(`s-${id}`);
        if (el) {
            el.currentTime = 0;
            el.play().catch(() => {}); // 자동재생 방지 에러 무시
        }
    }
};
