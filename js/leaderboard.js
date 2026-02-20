import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.loadRank = async function(difficulty) {
    // 1. 탭 버튼 스타일 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // 텍스트에 난이도가 포함되어 있으면 활성화 (예: "EASY (9x9)")
        if (btn.innerText.includes(difficulty)) {
            btn.classList.add('active');
        }
    });

    const list = document.getElementById('rank-list');
    const loading = document.getElementById('loading-text');
    
    // 초기화
    list.innerHTML = '';
    loading.style.display = 'block';

    try {
        // 2. 해당 난이도의 데이터만 가져오기
        const q = query(collection(db, "leaderboard"), where("difficulty", "==", difficulty));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        
        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:40px; text-align:center; color:#888;">No records yet.<br>Be the first challenger!</div>';
            return;
        }

        // 3. 데이터 변환 및 정렬 (클라이언트 사이드)
        let records = [];
        querySnapshot.forEach((doc) => records.push(doc.data()));
        
        // [수정됨] 정렬 로직: 1순위 블록등급(scoreIndex), 2순위 별(stars)
        records.sort((a, b) => {
            if (b.scoreIndex !== a.scoreIndex) {
                return b.scoreIndex - a.scoreIndex; // 블록 높은 순
            }
            return (b.stars || 0) - (a.stars || 0); // 별 많은 순
        });

        // 상위 50명 자르기
        records = records.slice(0, 50);

        // 4. [디자인 적용] HTML 그리기
        records.forEach((data, index) => {
            const rank = index + 1;
            const item = document.createElement('div');
            
            // CSS 클래스 적용 (rank-1, rank-2, rank-3 등)
            item.className = `rank-item ${rank <= 3 ? 'rank-' + rank : ''}`;
            
            // 메달 아이콘
            let rankDisplay = rank;
            if(rank === 1) rankDisplay = '🥇';
            else if(rank === 2) rankDisplay = '🥈';
            else if(rank === 3) rankDisplay = '🥉';

            // HTML 구조 (style.css의 디자인 활용)
            item.innerHTML = `
                <div class="rank-number">${rankDisplay}</div>
                <div class="rank-name">${data.username}</div>
                <div class="rank-stats">
                    <div class="rank-best">${data.bestChar} Block</div>
                    <div class="rank-stars">⭐ ${data.stars || 0}</div>
                </div>
            `;
            list.appendChild(item);
        });

    } catch (e) {
        console.error("Firebase Query Error: ", e);
        loading.innerHTML = '<span style="color:#e74c3c">Failed to load rankings.</span>';
    }
}

// 창이 켜지면 자동으로 EASY 랭킹 로드
window.onload = () => {
    loadRank('EASY');
};
