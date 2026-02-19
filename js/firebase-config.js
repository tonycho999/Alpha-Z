// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCHQI-CBSLfnBprSyQdgM8kqxSLduhXZXo",
    authDomain: "alpha-z-puzzle.firebaseapp.com",
    projectId: "alpha-z-puzzle",
    storageBucket: "alpha-z-puzzle.firebasestorage.app",
    messagingSenderId: "112629894683",
    appId: "1:112629894683:web:fff49e40044eb4dcf1b2be",
    measurementId: "G-6GJM44TPR3"
};

// 앱 초기화 및 DB 내보내기
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
