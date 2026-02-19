let myStars = parseInt(localStorage.getItem('alpha_stars')) || 0;
const isAdmin = localStorage.getItem('alpha_admin') === 'true';

if(isAdmin) {
    myStars = 10000;
    // 관리자라면 상점의 광고 시청 버튼 삭제
    const adBtn = document.getElementById('shop-ad-btn');
    if (adBtn) adBtn.classList.add('admin-no-ad');
}

document.getElementById('shop-stars').textContent = myStars;

window.watchAd = function() {
    if(isAdmin) return;
    window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
    setTimeout(() => {
        myStars += 1;
        localStorage.setItem('alpha_stars', myStars);
        document.getElementById('shop-stars').textContent = myStars;
        alert("Thanks for watching! (+1 Star)");
    }, 2000);
};
