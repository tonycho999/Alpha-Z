let myStars = parseInt(localStorage.getItem('alpha_stars')) || 0;
document.getElementById('shop-stars').textContent = myStars;

window.watchAd = function() {
    // 광고 시청 클릭 시 창 열기
    window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
    
    // 광고 창 띄운 후 바로 +1 별 지급 처리
    setTimeout(() => {
        myStars += 1;
        localStorage.setItem('alpha_stars', myStars);
        document.getElementById('shop-stars').textContent = myStars;
        alert("광고를 시청해주셔서 감사합니다! (+1 Star)");
    }, 2000);
};

window.buyItem = function(type) {
    alert("이 아이템은 게임 플레이 도중에 하단 버튼을 눌러 바로 사용할 수 있습니다.");
};
