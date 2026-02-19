import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.loadRank = async function(difficulty) {
    // 탭 스타일 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const list = document.getElementById('rank-list');
    const loading = document.getElementById('loading-text');
    list.innerHTML = '';
    loading.style.display = 'block';

    try {
        const q = query(collection(db, "leaderboard"), where("difficulty", "==", difficulty), orderBy("scoreIndex", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        
        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">No records yet. Be the first!</div>';
            return;
        }

        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'rank-item';
            
            let rankBadge = rank;
            if(rank === 1) rankBadge = '🥇';
            else if(rank === 2) rankBadge = '🥈';
            else if(rank === 3) rankBadge = '🥉';

            item.innerHTML = `
                <span style="width:30px; font-weight:bold;">${rankBadge}</span>
                <span style="flex-grow:1; color:white;">${data.username}</span>
                <span style="color:var(--accent); font-weight:bold;">${data.bestChar}</span>
            `;
            list.appendChild(item);
            rank++;
        });
    } catch (e) {
        console.error(e);
        loading.innerHTML = '<span style="color:#e74c3c">Failed to load data.</span>';
    }
}

window.onload = () => {
    // 최초에 EASY 자동 클릭
    document.querySelector('.tab-btn').click();
};
