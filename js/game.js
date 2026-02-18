let currentLevelIdx = 0;
let grid = [];
let size = 4;
let target = "";
let selectedTile = null; // 첫 번째 클릭한 타일
let moves = 0;

// 초기화
window.onload = () => loadLevel(currentLevelIdx);

function loadLevel(idx) {
    const levelData = LEVELS[idx];
    size = levelData.size;
    target = levelData.target;
    
    document.getElementById('target-word').innerText = target;
    document.getElementById('move-count').innerText = 0;
    moves = 0;
    
    // 그리드 CSS 클래스 조정 (4x4 or 5x5)
    const board = document.getElementById('grid-board');
    board.className = size === 5 ? 'grid-5x5' : 'grid-4x4';
    
    generateGrid();
    renderBoard();
}

// 랜덤 알파벳 그리드 생성
function generateGrid() {
    grid = [];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(let i=0; i < size*size; i++) {
        // 목표 단어의 글자들을 섞어서 일부러 넣어줌 (깰 수 있게)
        if (i < target.length) {
            grid.push(target[i]);
        } else {
            grid.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
        }
    }
    // 배열 섞기
    grid.sort(() => Math.random() - 0.5);
}

// 화면 그리기
function renderBoard() {
    const board = document.getElementById('grid-board');
    board.innerHTML = '';
    
    grid.forEach((char, index) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.innerText = char;
        
        // 선택된 타일 표시
        if (selectedTile === index) tile.classList.add('selected');
        
        tile.onclick = () => handleTileClick(index);
        board.appendChild(tile);
    });
}

// 타일 클릭 핸들러 (Swap 로직)
function handleTileClick(index) {
    if (selectedTile === null) {
        // 첫 번째 선택
        selectedTile = index;
    } else if (selectedTile === index) {
        // 같은 거 다시 누르면 취소
        selectedTile = null;
    } else {
        // 두 번째 선택 -> 스왑 시도
        if (isAdjacent(selectedTile, index)) {
            swapTiles(selectedTile, index);
            selectedTile = null;
            moves++;
            document.getElementById('move-count').innerText = moves;
            checkWin();
        } else {
            // 멀리 있는 거 누르면 선택 변경
            selectedTile = index;
        }
    }
    renderBoard();
}

// 인접한지 확인 (상하좌우)
function isAdjacent(idx1, idx2) {
    const row1 = Math.floor(idx1 / size);
    const col1 = idx1 % size;
    const row2 = Math.floor(idx2 / size);
    const col2 = idx2 % size;
    
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
}

// 타일 교체
function swapTiles(idx1, idx2) {
    const temp = grid[idx1];
    grid[idx1] = grid[idx2];
    grid[idx2] = temp;
}

// 승리 조건 체크 (가로, 세로 연결 확인)
function checkWin() {
    // 1. 가로 체크
    for (let r=0; r<size; r++) {
        let rowStr = "";
        for (let c=0; c<size; c++) rowStr += grid[r*size + c];
        if (rowStr.includes(target)) return gameWin();
    }
    
    // 2. 세로 체크
    for (let c=0; c<size; c++) {
        let colStr = "";
        for (let r=0; r<size; r++) colStr += grid[r*size + c];
        if (colStr.includes(target)) return gameWin();
    }
}

function gameWin() {
    document.getElementById('win-modal').classList.remove('hidden');
}

function nextLevel() {
    document.getElementById('win-modal').classList.add('hidden');
    currentLevelIdx++;
    if (currentLevelIdx >= LEVELS.length) currentLevelIdx = 0; // 루프
    loadLevel(currentLevelIdx);
}

function shuffleBoard() {
    grid.sort(() => Math.random() - 0.5);
    renderBoard();
}
