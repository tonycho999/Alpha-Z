import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.loadRank = async function(difficulty) {
    // 1. 버튼 스타일 업데이트 (선택된 모드 강조)
    const btns = document.querySelectorAll('.mode-selector .btn');
    btns.forEach(btn => {
        if(btn.textContent === difficulty) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // 2. UI 초기화
    document.getElementById('current-mode').textContent = `- ${difficulty} MODE -`;
    const list = document.getElementById('rank-list');
    list.innerHTML = '<div style="padding:20px; color:#aaa;">Loading...</div>';

    try {
        if (!db) {
            list.innerHTML = '<div style="padding:20px; color:red;">DB Error</div>';
            return;
        }

        // 3. DB 쿼리 (점수 기준 내림차순)
        const q = query(
            collection(db, "leaderboard"), 
            where("difficulty", "==", difficulty),
            orderBy("score", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        list.innerHTML = '';
        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:40px; color:#888;">No records yet.<br>Be the first challenger!</div>';
            return;
        }

        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            
            // 1~3등 스타일 클래스
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            item.className = `rank-item ${rankClass}`;
            
            // 메달 표시
            let medal = rank;
            if(rank === 1) medal = '🥇';
            else if(rank === 2) medal = '🥈';
            else if(rank === 3) medal = '🥉';

            // HTML 생성
            item.innerHTML = `
                <div class="rank-num">${medal}</div>
                <div class="rank-info">
                    <span class="rank-name">${data.username}</span>
                    <span class="rank-detail">Best Block: <strong>${data.bestChar || '?'}</strong></span>
                </div>
                <div class="rank-score">${(data.score || 0).toLocaleString()}</div>
            `;
            
            list.appendChild(item);
            rank++;
        });

    } catch (e) {
        console.error("Leaderboard Error:", e);
        list.innerHTML = `<div style="padding:20px; color:#e74c3c;">Failed to load data.<br><small>${e.message}</small></div>`;
        
        // 인덱스 에러일 경우 콘솔 확인 안내
        if(e.message.includes("index")) {
            console.log("🔥 Please create the index in Firebase Console via the link in the error message above.");
        }
    }
};

// 페이지 로드 시 기본 실행
window.onload = () => {
    loadRank('NORMAL');
};
