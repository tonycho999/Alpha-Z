import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// 튜토리얼 및 스타 표시
window.onload = function() {
    const stars = localStorage.getItem('alpha_stars') || 0;
    const starsEl = document.getElementById('idx-stars');
    if(starsEl) starsEl.textContent = stars;

    const hide = localStorage.getItem('hideTutorial');
    if(!hide) document.getElementById('popup-tute').style.display = 'flex';
};

// 전역 함수 등록 (HTML onclick용)
window.closeTute = function() {
    if(document.getElementById('chk-nomore').checked) localStorage.setItem('hideTutorial', 'true');
    document.getElementById('popup-tute').style.display = 'none';
};

window.selectDiff = function(diff) {
    window.location.href = `game.html?diff=${diff}`;
};

// 리더보드 팝업 로직 (공통 config 사용)
window.openLeaderboard = async function() {
    document.getElementById('popup-rank').style.display = 'flex';
    const list = document.getElementById('rank-list');
    list.innerHTML = '';
    document.getElementById('loading-text').style.display = 'block';

    try {
        const q = query(collection(db, "leaderboard"), orderBy("scoreIndex", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        document.getElementById('loading-text').style.display = 'none';
        
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'rank-item';
            item.innerHTML = `
                <span>${rank++}</span>
                <span>${data.username} <small style="color:#666">(${data.difficulty})</small></span>
                <span>${data.bestChar}</span>
            `;
            list.appendChild(item);
        });

        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">기록이 없습니다.</div>';
        }
    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="padding:20px; color:red;">불러오기 실패</div>';
    }
};
