class ChallengeManager {
    constructor(difficulty) {
        this.difficulty = difficulty; // 'Normal', 'Hard', 'Extreme'
        this.maxTileReached = 'A'; // 현재까지 만든 가장 높은 타일
    }

    // 타일 생성 확률 결정 함수
    getNextSpawnTile() {
        const rules = this.getRules(this.difficulty);
        const rand = Math.random() * 100;
        
        // C 타일 생성 조건 확인 (예: Normal에서 G 도달 시)
        let canSpawnC = this.checkCondition(rules.C.startCondition);
        let canSpawnD = this.checkCondition(rules.D.startCondition);

        // 확률 로직 구현 (요청하신 % 반영)
        // ... (생략: rand 값에 따라 A, B, C, D 반환)
    }

    // 타일이 더 이상 나오지 않아야 하는지 체크
    shouldDespawn(tileChar) {
        const rules = this.getRules(this.difficulty);
        const limitTile = rules[tileChar].stopCondition; 
        // 현재 maxTileReached가 limitTile보다 크거나 같으면 true 반환
    }
}
