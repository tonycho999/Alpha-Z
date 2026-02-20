// game-main.js

window.onload = () => {
    AudioMgr.init();
    
    // 데이터 로드
    state.stars = parseInt(localStorage.getItem('alpha_stars')) || 0;
    
    if(localStorage.getItem('alpha_admin') === 'true') {
        state.isAdmin = true;
    }
    updateAdminUI(); 
    UI.updateUI();

    // [중요] 이벤트 위임(Event Delegation) 방식
    // UI가 다시 그려져도 클릭 이벤트가 유지되도록 document에 이벤트를 겁니다.
    document.addEventListener('click', async (e) => {
        
        // 1. [신규 유저] 저장 버튼 클릭 감지
        if (e.target && e.target.id === 'btn-check-save') {
            if(window.playBtnSound) window.playBtnSound();

            const nameInput = document.getElementById('username-input');
            const name = nameInput ? nameInput.value.trim() : '';
            
            if(!name) return alert('Please enter your name!');
            
            console.log("📝 저장 시도(신규):", name); // 디버깅용 로그

            // 관리자 확인
            if (checkAdmin(name)) {
                updateAdminUI();
                alert(`Hello Admin ${name}! Ads removed.`);
                UI.updateUI(); 
            }

            // DB 저장 시도
            const res = await Core.saveScoreToDB(name, true);
            
            if(res.success) {
                console.log("🎉 저장 성공 메시지:", res.msg);
                // 성공 시 UI 처리
                const areaNew = document.getElementById('area-new-user');
                const msgBox = document.getElementById('save-msg');
                if(areaNew) areaNew.style.display = 'none';
                if(msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.innerText = "Saved Successfully!"; // 메시지 명시
                }
                localStorage.setItem('alpha_username', name);
            } else {
                console.error("🔥 저장 실패:", res.msg);
                alert("Save Failed: " + res.msg);
            }
        }

        // 2. [기존 유저] 저장 버튼 클릭 감지
        if (e.target && e.target.id === 'btn-just-save') {
            if(window.playBtnSound) window.playBtnSound();
            
            const savedName = localStorage.getItem('alpha_username');
            console.log("📝 저장 시도(기존):", savedName); // 디버깅용 로그

            const res = await Core.saveScoreToDB(savedName, false);
            
            if(res.success) {
                console.log("🎉 저장 성공 메시지:", res.msg);
                const areaExist = document.getElementById('area-exist-user');
                const msgBox = document.getElementById('save-msg');
                if(areaExist) areaExist.style.display = 'none';
                if(msgBox) {
                    msgBox.style.display = 'block';
                    // 보존된 경우와 갱신된 경우 메시지 구분
                    msgBox.innerText = res.msg || "Saved Successfully!";
                }
            } else {
                console.error("🔥 저장 실패:", res.msg);
                alert("Save Failed: " + res.msg);
            }
        }
    });
};
