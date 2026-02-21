import { state, initGridSize, checkAdmin, AdManager } from "./game-data.js";
import * as Core from "./game-core.js";
import * as UI from "./game-ui.js";
import * as Flow from "./game-flow.js";
import * as Logic from "./game-logic.js";
import { AudioMgr } from "./game-audio.js";

// Global Game Logic Binding
window.gameLogic = {
    ...Flow, ...Logic, ...Core,
    useRefresh: () => Logic.useRefresh(() => Flow.checkHandAndRefill()),
    useHammer: () => Logic.useHammer(),
    useUpgrade: () => Logic.useUpgrade(),
    tryReviveWithAd: () => {
        AdManager.showRewardAd(() => {
            state.hasRevived = true;
            const center = Math.floor(state.gridSize/2);
            for(let r=center-1; r<=center+1; r++){
                for(let c=center-1; c<=center+1; c++){
                    const idx = r*state.gridSize+c;
                    if(idx>=0 && idx<state.grid.length) state.grid[idx] = null;
                }
            }
            document.getElementById('popup-over').style.display = 'none';
            UI.renderGrid();
            Flow.checkHandAndRefill();
        });
    },
    saveScore: async () => {
        const nameInput = document.getElementById('username-input');
        const name = nameInput ? nameInput.value : localStorage.getItem('alpha_username');
        if(!name) { alert("Enter Name"); return; }
        const res = await Core.saveScoreToDB(name, !!nameInput);
        if(res.success) {
            document.getElementById('save-msg').style.display = 'block';
            document.getElementById('btn-check-save').style.display = 'none';
            document.getElementById('btn-just-save').style.display = 'none';
            localStorage.setItem('alpha_username', name);
        } else alert(res.msg);
    }
};

window.onload = () => {
    try {
        console.log("🚀 Game Start");
        
        document.addEventListener('click', (e) => {
            if(e.target.closest('button, .btn, .hand-slot')) AudioMgr.play('button');
        });

        // 1. Load Data
        if(localStorage.getItem('alpha_stars')) state.stars = parseInt(localStorage.getItem('alpha_stars'));
        if(localStorage.getItem('alpha_items')) state.items = JSON.parse(localStorage.getItem('alpha_items'));
        if(localStorage.getItem('alpha_best')) state.best = localStorage.getItem('alpha_best');

        const params = new URLSearchParams(window.location.search);
        const diff = params.get('diff') || 'NORMAL';
        state.diff = diff;
        
        initGridSize(diff); 

        // 2. Resume or New Game
        const savedGame = localStorage.getItem('alpha_gamestate');
        let resumed = false;
        
        if (savedGame) {
            try {
                const loaded = JSON.parse(savedGame);
                if(loaded.diff === diff) {
                    state.grid = loaded.grid;
                    state.hand = loaded.hand;
                    state.score = loaded.score;
                    state.best = loaded.best;
                    state.stars = loaded.stars;
                    if(loaded.items) state.items = loaded.items;
                    console.log("Resume");
                    resumed = true;
                }
            } catch(e) { console.error(e); }
        }
        
        if (!resumed) {
            // [CRITICAL] New Game: Ensure hand is empty to trigger refill
            state.hand = [null, null, null];
            Flow.checkHandAndRefill();
        } else {
            // If resumed, ensure hand UI is rendered
            UI.renderHand();
            UI.setupDrag(Flow.handleDropAttempt);
        }

        const savedName = localStorage.getItem('alpha_username');
        if(savedName) checkAdmin(savedName);

        UI.renderGrid();
        UI.updateUI();

    } catch (e) {
        console.error("Init Fail:", e);
        initGridSize('NORMAL');
        UI.renderGrid();
        // Force Refill on Error
        state.hand = [null, null, null];
        Flow.checkHandAndRefill();
    }
};
