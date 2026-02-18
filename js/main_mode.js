// 목표 단어 (레벨에 따라 DB에서 가져옴)
let targetWord = "AD"; 

function checkTargetWordMatch(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const targetLen = targetWord.length;

    // 가로 검사
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols - targetLen; c++) {
            let str = "";
            for (let k = 0; k < targetLen; k++) {
                if(grid[r][c+k]) str += grid[r][c+k].value;
            }
            if (str === targetWord) return true;
        }
    }
    
    // 세로 검사 등 추가 가능
    return false;
}

function onMoveComplete() {
    if (checkTargetWordMatch(currentGrid)) {
        alert("성공! 다음 레벨로 이동합니다.");
        // 레벨업 처리 및 Firebase 업데이트
    }
}
