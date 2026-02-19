// Firebase SDK Import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCHQI-CBSLfnBprSyQdgM8kqxSLduhXZXo",
    authDomain: "alpha-z-puzzle.firebaseapp.com",
    projectId: "alpha-z-puzzle",
    storageBucket: "alpha-z-puzzle.firebasestorage.app",
    messagingSenderId: "112629894683",
    appId: "1:112629894683:web:fff49e40044eb4dcf1b2be",
    measurementId: "G-6GJM44TPR3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SHAPES = [
    { w:3, h:1, map:[[0,0],[0,1],[0,2]] },
    { w:1, h:3, map:[[0,0],[1,0],[2,0]] },
    { w:2, h:2, map:[[0,0],[1,0],[1,1]] },
    { w:2, h:2, map:[[0,0],[0,1],[1,0]] },
    { w:2, h:2, map:[[0,0],[0,1],[1,1]] },
    { w:2, h:2, map:[[0,1],[1,1],[1,0]] },
];

const gameLogic = {
    state: {
        grid: Array(25).fill(null),
        stars: 10,
        best: 'A',
        diff: 'NORMAL',
        currentBlock: null,
        nextBlock: null,
        isLocked: false 
    },

    init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.state.diff = urlParams.get('diff') || 'NORMAL';
        document.getElementById('ui-diff').textContent = this.state.diff;

        this.initGrid();
        this.state.nextBlock = this.createRandomBlock();
        this.shiftBlock();
        this.updateUI();

        // 저장 버튼 이벤트 리스너 연결
        document.getElementById('btn-save-score').addEventListener('click', () => this.saveToLeaderboard());
    },

    initGrid() {
        const container = document.getElementById('grid-container');
        container.innerHTML = '';
        for(let i=0; i<25; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}`;
            container.appendChild(cell);
        }
    },

    shiftBlock() {
        this.state.currentBlock = this.state.nextBlock;
        this.state.nextBlock = this.createRandomBlock();
        
        this.renderSource(this.state.currentBlock, 'source-block');
        this.renderSource(this.state.nextBlock, 'next-preview');

        if(!this.canPlaceAnywhere(this.state.currentBlock)) {
            this.showGameOver();
        }
    },

    createRandomBlock() {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const maxIdx = ALPHABET.indexOf(this.state.best);
        let minIdx = 0;
        
        if(this.state.diff === 'HARD') minIdx = Math.max(0, maxIdx - 5);
        else if(this.state.diff === 'HELL') minIdx = Math.max(0, maxIdx - 8);
        else minIdx = Math.max(0, maxIdx - 3);

        const items = [];
        items.push(this.getRandomChar(minIdx));
        
        let second;
        do { second = this.getRandomChar(minIdx); } while (second === items[0]);
        items.push(second);
        
        let third;
        do { third = this.getRandomChar(minIdx); } while (third === items[1]);
        items.push(third);

        return { shape, items };
    },

    getRandomChar(minIdx) {
        const offset = Math.random() > 0.8 ? 1 : 0;
        return ALPHABET[minIdx + offset] || 'A';
    },

    renderSource(block, elementId) {
        const el = document.getElementById(elementId);
        el.innerHTML = '';
        const shape = block.shape;
        const size = elementId === 'next-preview' ? '40px' : 'var(--cell-size)';
        
        el.style.gridTemplateColumns = `repeat(${shape.w}, ${size})`;
        el.style.gridTemplateRows = `repeat(${shape.h}, ${size})`;
        
        block.items.forEach((char, i) => {
            const coord = shape.map[i];
            const b = document.createElement('div');
            if(elementId === 'next-preview') {
                b.className = `cell b-${char}`;
                b.style.width = size; b.style.height = size;
            } else {
                b.className = `cell b-${char}`;
            }
            b.textContent = char;
            b.style.gridColumnStart = coord[1] + 1;
            b.style.gridRowStart = coord[0] + 1;
            el.appendChild(b);
        });

        if(elementId === 'source-block') this.setupDrag();
    },

    setupDrag() {
        const source = document.getElementById('source-block');
        const ghost = document.getElementById('ghost');
        let isDragging = false;

        const start = (e) => {
            if(this.state.isLocked) return;
            e.preventDefault();
            isDragging = true;
            ghost.innerHTML = source.innerHTML;
            ghost.style.display = 'grid';
            ghost.style.gridTemplateColumns = source.style.gridTemplateColumns;
            ghost.style.gridTemplateRows = source.style.gridTemplateRows;

            const ptr = e.touches ? e.touches[0] : e;
            this.moveGhost(ptr.clientX, ptr.clientY);
            source.style.opacity = '0';
        };

        const move = (e) => {
            if(!isDragging) return;
            const ptr = e.touches ? e.touches[0] : e;
            this.moveGhost(ptr.clientX, ptr.clientY);
            this.checkHover(ptr.clientX, ptr.clientY);
        };

        const end = (e) => {
            if(!isDragging) return;
            isDragging = false;
            const ptr = e.changedTouches ? e.changedTouches[0] : e;
            const targetIdx = this.getClosestCellIndex(ptr.clientX, ptr.clientY);
            ghost.style.display = 'none';
            source.style.opacity = '1';
            this.clearHighlights();

            if(targetIdx !== -1) {
                this.tryPlaceBlock(targetIdx);
            }
        };

        source.ontouchstart = start;
        source.onmousedown = start;
        window.ontouchmove = move;
        window.onmousemove = move;
        window.ontouchend = end;
        window.onmouseup = end;
    },

    moveGhost(x, y) {
        const ghost = document.getElementById('ghost');
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
    },

    getClosestCellIndex(x, y) {
        let minDist = 9999;
        let targetIdx = -1;
        for(let i=0; i<25; i++) {
            const cell = document.getElementById(`cell-${i}`);
            const rect = cell.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const dist = Math.hypot(cx - x, cy - y);
            if(dist < 50 && dist < minDist) {
                minDist = dist;
                targetIdx = i;
            }
        }
        return targetIdx;
    },

    findBestFit(targetIdx) {
        const shape = this.state.currentBlock.shape;
        const r = Math.floor(targetIdx / 5);
        const c = targetIdx % 5;

        for (let i = 0; i < shape.map.length; i++) {
            const refR = shape.map[i][0];
            const refC = shape.map[i][1];
            const anchorR = r - refR;
            const anchorC = c - refC;
            const indices = [];
            let possible = true;

            for (let j = 0; j < shape.map.length; j++) {
                const tr = anchorR + shape.map[j][0];
                const tc = anchorC + shape.map[j][1];
                const tidx = tr * 5 + tc;
                if (tr < 0 || tr >= 5 || tc < 0 || tc >= 5 || this.state.grid[tidx] !== null) {
                    possible = false; break;
                }
                indices.push(tidx);
            }
            if (possible) return indices;
        }
        return null;
    },

    canPlaceAnywhere(block) {
        const shape = block.shape;
        for(let r=0; r<5; r++) {
            for(let c=0; c<5; c++) {
                let possible = true;
                for(let j=0; j<shape.map.length; j++) {
                    const tr = r + shape.map[j][0];
                    const tc = c + shape.map[j][1];
                    const tidx = tr * 5 + tc;
                    if(tr>=5 || tc>=5 || this.state.grid[tidx] !== null) {
                        possible = false; break;
                    }
                }
                if(possible) return true;
            }
        }
        return false;
    },

    checkHover(x, y) {
        this.clearHighlights();
        const idx = this.getClosestCellIndex(x, y);
        if(idx === -1) return;
        const indices = this.findBestFit(idx);
        if(indices) {
            indices.forEach(i => {
                document.getElementById(`cell-${i}`).classList.add('highlight-valid');
            });
        }
    },

    clearHighlights() {
        document.querySelectorAll('.highlight-valid').forEach(e => e.classList.remove('highlight-valid'));
    },

    async tryPlaceBlock(targetIdx) {
        const indices = this.findBestFit(targetIdx);
        if(!indices) return;

        this.state.isLocked = true;
        indices.forEach((pos, i) => {
            this.state.grid[pos] = this.state.currentBlock.items[i];
        });
        this.renderGrid();
        await this.wait(300);

        let changes = true;
        while(changes) {
            changes = false;
            for(let i=0; i<25; i++) {
                if(this.state.grid[i]) {
                    const merged = await this.processClusterMerge(i);
                    if(merged) { changes = true; break; }
                }
            }
        }
        
        this.state.isLocked = false;
        this.shiftBlock();
    },

    getCluster(startIdx) {
        const char = this.state.grid[startIdx];
        if (!char) return [];
        const cluster = [startIdx];
        const queue = [startIdx];
        const visited = new Set([startIdx]);

        while(queue.length > 0) {
            const curr = queue.pop();
            const c = curr % 5;
            const neighbors = [curr-1, curr+1, curr-5, curr+5];
            for(let n of neighbors) {
                if(n<0 || n>=25) continue;
                if(Math.abs((n%5)-c) > 1 && Math.abs(n-curr)===1) continue;
                if(!visited.has(n) && this.state.grid[n] === char) {
                    visited.add(n); cluster.push(n); queue.push(n);
                }
            }
        }
        return cluster;
    },

    async processClusterMerge(idx) {
        const cluster = this.getCluster(idx);
        const char = this.state.grid[idx];
        const count = cluster.length;

        if (count >= 2) {
            const jump = count - 1;
            const nextIdx = ALPHABET.indexOf(char) + jump;
            const next = ALPHABET[nextIdx] || char;

            await this.animateMerge(idx, cluster);

            this.state.grid[idx] = next;
            cluster.forEach(n => { if(n !== idx) this.state.grid[n] = null; });

            this.updateScore(next, count);
            this.renderGrid();
            await this.wait(300);
            return true;
        }
        return false;
    },

    async animateMerge(centerIdx, targets) {
        const centerEl = document.getElementById(`cell-${centerIdx}`);
        for(let t of targets) {
            if(t === centerIdx) continue;
            const targetEl = document.getElementById(`cell-${t}`);
            targetEl.classList.add('merging-source');
            const dx = centerEl.offsetLeft - targetEl.offsetLeft;
            const dy = centerEl.offsetTop - targetEl.offsetTop;
            targetEl.style.transform = `translate(${dx}px, ${dy}px)`;
            targetEl.style.opacity = '0';
        }
        await this.wait(400);
    },

    renderGrid() {
        for(let i=0; i<25; i++) {
            const cell = document.getElementById(`cell-${i}`);
            const char = this.state.grid[i];
            cell.className = 'cell';
            cell.textContent = '';
            cell.style.transform = '';
            cell.style.opacity = '1';
            if(char) {
                cell.textContent = char;
                cell.classList.add(`b-${char}`);
                if(char==='Z') cell.classList.add('b-Z');
                cell.classList.add('pop-effect');
            }
        }
    },

    updateScore(char, pt) {
        this.state.stars += pt;
        document.getElementById('ui-stars').textContent = this.state.stars;
        if(ALPHABET.indexOf(char) > ALPHABET.indexOf(this.state.best)) {
            this.state.best = char;
            document.getElementById('ui-best').textContent = char;
        }
    },

    showGameOver() {
        document.getElementById('over-best').textContent = this.state.best;
        document.getElementById('save-area').style.display = 'block'; // 입력창 보이기
        document.getElementById('popup-over').style.display = 'flex';
    },

    revive() {
        if(this.state.stars < 5) return alert('스타가 부족합니다.');
        this.state.stars -= 5;
        for(let i=0; i<5; i++) this.state.grid[i] = null;
        document.getElementById('popup-over').style.display = 'none';
        this.renderGrid();
        this.updateUI();
    },

    updateUI() {
        document.getElementById('ui-stars').textContent = this.state.stars;
        document.getElementById('ui-best').textContent = this.state.best;
    },

    wait(ms) { return new Promise(r => setTimeout(r, ms)); },

    // --- Firebase 저장 로직 ---
    async saveToLeaderboard() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput.value.trim();

        if (!username) {
            alert("이름을 입력해주세요!");
            return;
        }

        try {
            await addDoc(collection(db, "leaderboard"), {
                username: username,
                bestChar: this.state.best,
                scoreIndex: ALPHABET.indexOf(this.state.best), // 정렬용
                difficulty: this.state.diff,
                stars: this.state.stars,
                timestamp: serverTimestamp()
            });

            document.getElementById('save-area').style.display = 'none';
            document.getElementById('save-msg').style.display = 'block';
            
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("저장 실패 ㅠㅠ");
        }
    }
};

// Start via global scope (for module)
window.gameLogic = gameLogic;
window.onload = () => gameLogic.init();
