import { AdManager } from "./game-data.js";

let myStars = parseInt(localStorage.getItem('alpha_stars')) || 0;
const isAdmin = localStorage.getItem('alpha_admin') === 'true';

if(isAdmin) {
    myStars = 10000;
    const adBtn = document.getElementById('shop-ad-btn');
    if (adBtn) adBtn.classList.add('admin-no-ad');
}
document.getElementById('shop-stars').textContent = myStars;

// 1초마다 광고 버튼 상태 갱신 (타이머)
setInterval(updateAdButtonUI, 1000);
updateAdButtonUI();

function updateAdButtonUI() {
    if(isAdmin) return;
    const btn = document.getElementById('shop-ad-btn');
    const textEl = document.getElementById('ad-text-status');
    if(!btn || !textEl) return;

    const status = AdManager.canWatchAd();
    
    if(status.canWatch) {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
        let count = parseInt(localStorage.getItem('alpha_ad_count')) || 0;
        textEl.innerText = `Watch Ad (${count}/10)`;
    } else {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
        if (status.reason === 'cooldown') {
            const min = Math.floor(status.remaining / 60000);
            const sec = Math.floor((status.remaining % 60000) / 1000);
            textEl.innerText = `Wait ${min}m ${sec}s`;
        } else {
            textEl.innerText = "Limit Reached";
        }
    }
}

window.watchAdShop = function() {
    if(isAdmin) return;
    const status = AdManager.canWatchAd();
    if(!status.canWatch) return;

    window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
    
    setTimeout(() => {
        AdManager.recordAdWatch();
        myStars += 2; // 보상 2스타로 증가
        localStorage.setItem('alpha_stars', myStars);
        document.getElementById('shop-stars').textContent = myStars;
        updateAdButtonUI();
        alert("Thanks for watching! (+2 Stars)");
    }, 2000);
};
