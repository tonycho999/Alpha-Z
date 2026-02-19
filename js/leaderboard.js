import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.loadRank = async function(difficulty) {
    // 1. 탭 스타일 안전하게 업데이트 (event 에러 방지)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // 버튼 텍스트에 EASY, NORMAL 등이 포함되어 있으면 활성화
        if (btn.innerText.includes(difficulty)) {
            btn.classList.add('active');
        }
    });

    const list = document.getElementById('rank-list');
    const loading = document.getElementById('loading-text');
    list.innerHTML = '';
    loading.style.display = 'block';

    try {
        // 2. Firebase 복합 인덱스 에러 방지 (where만 사용해서 데이터 호출)
        const q = query(collection(db, "leaderboard"), where("difficulty", "==", difficulty));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        
        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">No records yet. Be the first!</div>';
            return;
        }

        // 3. 데이터를 자바스크립트 배열로 옮겨서 직접 내림차순 정렬
        let records = [];
        querySnapshot.forEach((doc) => records.push(doc.data()));
        
        // scoreIndex 기준으로 내림차순 정렬 후 상위 50개만 자르기
        records.sort((a, b) => b.scoreIndex - a.scoreIndex);
        records = records.slice(0, 50);

        // 4. 화면에 그리기
        let rank = 1;
        records.forEach((data) => {
            const item = document.createElement('div');
            item.className = 'rank-item';
            
            let rankBadge = rank;
            if(rank === 1) rankBadge = '🥇';
            else if(rank === 2) rankBadge = '🥈';
            else if(rank === 3) rankBadge = '🥉';

            item.innerHTML = `
                <span style="width:30px; font-weight:bold;">${rankBadge}</span>
                <span style="flex-grow:1; color:white; text-align:left;">${data.username}</span>
                <span style="color:var(--accent); font-weight:bold;">${data.bestChar}</span>
            `;
            list.appendChild(item);
            rank++;
        });

    } catch (e) {
        console.error("Firebase Query Error: ", e);
        loading.innerHTML = '<span style="color:#e74c3c">Failed to load data.</span>';
    }
}

// 창이 켜지면 자동으로 EASY 랭킹을 불러옴
window.onload = () => {
    loadRank('EASY');
};
