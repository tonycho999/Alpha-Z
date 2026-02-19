let myStars = parseInt(localStorage.getItem('alpha_stars')) || 0;
const isAdmin = localStorage.getItem('alpha_admin') === 'true';

if(isAdmin) myStars = 10000;
document.getElementById('shop-stars').textContent = myStars;

window.watchAd = function() {
    if(isAdmin) return alert("Admin does not need to watch ads!");
    
    window.open('https://www.effectivegatecpm.com/erzanv6a5?key=78fb5625f558f9e3c9b37b431fe339cb', '_blank');
    
    setTimeout(() => {
        myStars += 1;
        localStorage.setItem('alpha_stars', myStars);
        document.getElementById('shop-stars').textContent = myStars;
        alert("Thanks for watching! (+1 Star)");
    }, 2000);
};
