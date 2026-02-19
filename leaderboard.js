// leaderboard.js
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js"; // 공통 설정 불러오기

async function loadLeaderboard() {
    const list = document.getElementById('rank-list');
    const loading = document.getElementById('loading-text');
    list.innerHTML = '';

    try {
        // 점수(인덱스) 기준 내림차순 정렬, 상위 50개
        const q = query(collection(db, "leaderboard"), orderBy("scoreIndex", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        
        loading.style.display = 'none';
        
        if(querySnapshot.empty) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">아직 기록이 없습니다.<br>첫 번째 주인공이 되어보세요!</div>';
            return;
        }

        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'rank-item';
            
            // 1,2,3위 강조 스타일
            let rankBadge = rank;
            if(rank === 1) rankBadge = '🥇';
            else if(rank === 2) rankBadge = '🥈';
            else if(rank === 3) rankBadge = '🥉';

            item.innerHTML = `
                <span class="rank-num">${rankBadge}</span>
                <span class="rank-name">${data.username} <small style="color:#666; font-size:0.7rem;">(${data.difficulty})</small></span>
                <span class="rank-score">${data.bestChar}</span>
            `;
            list.appendChild(item);
            rank++;
        });

    } catch (e) {
        console.error("Error fetching leaderboard: ", e);
        loading.innerHTML = '<span style="color:#e74c3c">데이터를 불러오지 못했습니다.</span>';
    }
}

// 페이지 로드 시 실행
window.onload = loadLeaderboard;
