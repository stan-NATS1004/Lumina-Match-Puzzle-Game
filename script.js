/**
 * Lumina Match - Game Logic
 */

const LEVELS = [
    { level: 1, gridSize: 6, colors: 3, target: 1000, moves: 15 },
    { level: 2, gridSize: 6, colors: 4, target: 1500, moves: 18 },
    { level: 3, gridSize: 7, colors: 4, target: 2000, moves: 20 },
    { level: 4, gridSize: 7, colors: 5, target: 2500, moves: 22 },
    { level: 5, gridSize: 8, colors: 5, target: 3000, moves: 25 },
    { level: 6, gridSize: 8, colors: 6, target: 4000, moves: 25 },
    { level: 7, gridSize: 8, colors: 6, target: 5000, moves: 20 }, // Harder (less moves)
    { level: 8, gridSize: 9, colors: 6, target: 6000, moves: 30 },
    { level: 9, gridSize: 9, colors: 7, target: 7500, moves: 35 },
    { level: 10, gridSize: 10, colors: 7, target: 10000, moves: 40 }
];

class Game {
    constructor() {
        this.currentLevelIndex = 0;
        this.score = 0;
        this.moves = 0;
        this.grid = [];
        this.selectedTile = null;
        this.isAnimating = false;

        // DOM Elements
        this.gridEl = document.getElementById('grid');
        this.levelEl = document.getElementById('level-value');
        this.scoreEl = document.getElementById('score-value');
        this.targetEl = document.getElementById('target-value');
        this.movesEl = document.getElementById('moves-value');

        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.levelSelectScreen = document.getElementById('level-select-screen');
        this.rulesScreen = document.getElementById('rules-screen');
        this.levelCompleteScreen = document.getElementById('level-complete-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.victoryScreen = document.getElementById('victory-screen');

        // Progress
        this.unlockedLevels = 1; // Start with level 1 unlocked

        this.bindEvents();
        this.generateLevelGrid();
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startLevel(this.unlockedLevels - 1));
        document.getElementById('levels-btn').addEventListener('click', () => this.showScreen(this.levelSelectScreen));
        document.getElementById('help-btn').addEventListener('click', () => this.showScreen(this.rulesScreen));

        document.getElementById('close-rules-btn').addEventListener('click', () => {
            this.hideAllScreens();
            this.startScreen.classList.add('active');
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.hideAllScreens();
            this.startScreen.classList.add('active');
        });

        document.getElementById('next-level-btn').addEventListener('click', () => {
            this.startLevel(this.currentLevelIndex + 1);
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startLevel(this.currentLevelIndex);
        });

        document.getElementById('home-btn').addEventListener('click', () => {
            this.hideAllScreens();
            this.startScreen.classList.add('active');
        });
    }

    generateLevelGrid() {
        const container = document.getElementById('level-grid');
        container.innerHTML = '';

        LEVELS.forEach((lvl, index) => {
            const btn = document.createElement('div');
            btn.className = 'level-btn';
            btn.textContent = lvl.level;

            if (index + 1 > this.unlockedLevels) {
                btn.classList.add('locked');
            } else {
                btn.addEventListener('click', () => this.startLevel(index));
            }

            container.appendChild(btn);
        });
    }

    startLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            this.showScreen(this.victoryScreen);
            document.getElementById('final-score').textContent = this.score;
            return;
        }

        // Unlock next level if we just beat the current max unlocked
        if (levelIndex + 1 > this.unlockedLevels) {
            this.unlockedLevels = levelIndex + 1;
        }

        this.currentLevelIndex = levelIndex;
        this.levelConfig = LEVELS[levelIndex];

        // Reset state for level
        this.moves = this.levelConfig.moves;
        this.levelScore = 0;

        this.updateHUD();
        this.generateGrid();
        this.hideAllScreens();
    }

    updateHUD() {
        this.levelEl.textContent = this.levelConfig.level;
        this.scoreEl.textContent = this.levelScore;
        this.targetEl.textContent = this.levelConfig.target;
        this.movesEl.textContent = this.moves;
    }

    generateGrid() {
        this.grid = [];
        this.gridEl.innerHTML = '';
        const size = this.levelConfig.gridSize;

        this.gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

        // Initialize empty grid
        for (let r = 0; r < size; r++) {
            this.grid[r] = [];
            for (let c = 0; c < size; c++) {
                this.grid[r][c] = null;
            }
        }

        // Fill grid ensuring no initial matches
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                let type;
                do {
                    type = Math.floor(Math.random() * this.levelConfig.colors);
                } while (this.hasInitialMatch(r, c, type));

                const tile = this.createTileElement(r, c, type);
                this.grid[r][c] = { type, el: tile, row: r, col: c };
                this.gridEl.appendChild(tile);
            }
        }
    }

    hasInitialMatch(row, col, type) {
        // Check horizontal
        if (col >= 2 && this.grid[row][col - 1].type === type && this.grid[row][col - 2].type === type) {
            return true;
        }
        // Check vertical
        if (row >= 2 && this.grid[row - 1][col].type === type && this.grid[row - 2][col].type === type) {
            return true;
        }
        return false;
    }

    createTileElement(row, col, type) {
        const div = document.createElement('div');
        div.className = 'tile new';
        div.dataset.type = type;
        div.dataset.row = row;
        div.dataset.col = col;

        div.addEventListener('mousedown', (e) => this.handleDragStart(e));
        div.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
        div.addEventListener('click', (e) => this.handleTileClick(e));

        return div;
    }

    handleDragStart(e) {
        if (this.isAnimating) return;

        const el = e.currentTarget;
        const row = parseInt(el.dataset.row);
        const col = parseInt(el.dataset.col);

        this.dragStartTile = { row, col };
        this.dragStartX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        this.dragStartY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        // Bind move/end events to document to catch dragging outside the tile
        this.boundHandleDragMove = (e) => this.handleDragMove(e);
        this.boundHandleDragEnd = () => this.handleDragEnd();

        document.addEventListener('mousemove', this.boundHandleDragMove);
        document.addEventListener('mouseup', this.boundHandleDragEnd);
        document.addEventListener('touchmove', this.boundHandleDragMove, { passive: false });
        document.addEventListener('touchend', this.boundHandleDragEnd);
    }

    handleDragMove(e) {
        if (!this.dragStartTile) return;

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        const dx = clientX - this.dragStartX;
        const dy = clientY - this.dragStartY;
        const threshold = 30; // pixels to trigger swap

        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            // Determine direction
            let targetRow = this.dragStartTile.row;
            let targetCol = this.dragStartTile.col;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal
                if (dx > 0) targetCol++;
                else targetCol--;
            } else {
                // Vertical
                if (dy > 0) targetRow++;
                else targetRow--;
            }

            // Check bounds
            if (targetRow >= 0 && targetRow < this.levelConfig.gridSize &&
                targetCol >= 0 && targetCol < this.levelConfig.gridSize) {

                const tile1 = this.grid[this.dragStartTile.row][this.dragStartTile.col];
                const tile2 = this.grid[targetRow][targetCol];

                if (tile1 && tile2) {
                    this.swapTiles(tile1, tile2);
                }
            }

            // Stop tracking after trigger
            this.handleDragEnd();
        }

        // Prevent scrolling on touch
        if (e.type === 'touchmove') {
            e.preventDefault();
        }
    }

    handleDragEnd() {
        this.dragStartTile = null;
        document.removeEventListener('mousemove', this.boundHandleDragMove);
        document.removeEventListener('mouseup', this.boundHandleDragEnd);
        document.removeEventListener('touchmove', this.boundHandleDragMove);
        document.removeEventListener('touchend', this.boundHandleDragEnd);
    }

    handleTileClick(e) {
        if (this.isAnimating) return;

        const el = e.currentTarget;
        const row = parseInt(el.dataset.row);
        const col = parseInt(el.dataset.col);

        // Re-fetch tile from grid to ensure we have current state (in case of shifts)
        // Actually, the grid array should be the source of truth.
        const tileObj = this.grid[row][col];

        if (!tileObj) return; // Should not happen

        if (this.selectedTile) {
            const selectedObj = this.selectedTile;

            // If clicking the same tile, deselect
            if (selectedObj === tileObj) {
                this.deselectTile();
                return;
            }

            // Check if adjacent
            const dRow = Math.abs(selectedObj.row - row);
            const dCol = Math.abs(selectedObj.col - col);

            if (dRow + dCol === 1) {
                this.deselectTile();
                this.swapTiles(selectedObj, tileObj);
            } else {
                // Select new tile
                this.deselectTile();
                this.selectTile(tileObj);
            }
        } else {
            this.selectTile(tileObj);
        }
    }

    selectTile(tileObj) {
        this.selectedTile = tileObj;
        tileObj.el.classList.add('selected');
    }

    deselectTile() {
        if (this.selectedTile) {
            this.selectedTile.el.classList.remove('selected');
            this.selectedTile = null;
        }
    }

    async swapTiles(tile1, tile2) {
        this.isAnimating = true;

        // Visual Swap
        // We can swap the visual elements in the DOM or just animate them.
        // Let's animate via transform, then actually swap DOM nodes/data.

        // Simple swap logic: swap types and re-render (or update attributes)
        // But we want animation.

        const el1 = tile1.el;
        const el2 = tile2.el;

        // Calculate relative distance for transform
        const xDiff = (tile2.col - tile1.col) * 100; // 100% of tile width
        const yDiff = (tile2.row - tile1.row) * 100;

        el1.style.transform = `translate(${xDiff}%, ${yDiff}%)`;
        el2.style.transform = `translate(${-xDiff}%, ${-yDiff}%)`;

        await new Promise(r => setTimeout(r, 250)); // Wait for transition

        // Reset transforms
        el1.style.transform = '';
        el2.style.transform = '';

        // Swap data in grid
        this.grid[tile1.row][tile1.col] = tile2;
        this.grid[tile2.row][tile2.col] = tile1;

        // Update internal coordinates
        const t1Row = tile1.row, t1Col = tile1.col;
        tile1.row = tile2.row; tile1.col = tile2.col;
        tile2.row = t1Row; tile2.col = t1Col;

        // Update DOM attributes and position in container (appendChild moves it to end, insertBefore is better, 
        // but since we use CSS Grid order based on DOM order, we need to swap DOM nodes)
        // Actually, with CSS Grid, order is determined by DOM order.
        // We need to swap the elements in the DOM tree.
        const nextSibling1 = el1.nextSibling;
        const nextSibling2 = el2.nextSibling;
        const parent = this.gridEl;

        // If they are adjacent, special handling is needed, but replaceWith is easier if supported or just re-append.
        // Simplest way for grid: just swap the 'data-type' and trigger a re-render or update class.
        // BUT we want to keep the element instances if possible for event listeners etc.
        // Let's just swap the DOM nodes.

        const placeholder = document.createElement('div');
        parent.insertBefore(placeholder, el1);
        parent.insertBefore(el1, el2);
        parent.insertBefore(el2, placeholder);
        parent.removeChild(placeholder);

        // Update data attributes for debugging/styling
        el1.dataset.row = tile1.row; el1.dataset.col = tile1.col;
        el2.dataset.row = tile2.row; el2.dataset.col = tile2.col;

        // Check for matches
        const matches = this.findMatches();

        if (matches.length > 0) {
            this.moves--;
            this.updateHUD();
            await this.processMatches(matches);
        } else {
            // Swap back if no match
            await new Promise(r => setTimeout(r, 100));

            // Animate back
            el1.style.transform = `translate(${-xDiff}%, ${-yDiff}%)`;
            el2.style.transform = `translate(${xDiff}%, ${yDiff}%)`;

            await new Promise(r => setTimeout(r, 250));

            el1.style.transform = '';
            el2.style.transform = '';

            // Swap data back
            this.grid[tile1.row][tile1.col] = tile2;
            this.grid[tile2.row][tile2.col] = tile1;

            const t1RowBack = tile1.row, t1ColBack = tile1.col;
            tile1.row = tile2.row; tile1.col = tile2.col;
            tile2.row = t1RowBack; tile2.col = t1ColBack;

            // Swap DOM back
            const placeholderBack = document.createElement('div');
            parent.insertBefore(placeholderBack, el1);
            parent.insertBefore(el1, el2);
            parent.insertBefore(el2, placeholderBack);
            parent.removeChild(placeholderBack);

            el1.dataset.row = tile1.row; el1.dataset.col = tile1.col;
            el2.dataset.row = tile2.row; el2.dataset.col = tile2.col;
        }

        this.isAnimating = false;
    }

    findMatches() {
        const matches = new Set();
        const size = this.levelConfig.gridSize;

        // Horizontal
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 2; c++) {
                const type = this.grid[r][c].type;
                if (this.grid[r][c + 1].type === type && this.grid[r][c + 2].type === type) {
                    matches.add(this.grid[r][c]);
                    matches.add(this.grid[r][c + 1]);
                    matches.add(this.grid[r][c + 2]);
                }
            }
        }

        // Vertical
        for (let c = 0; c < size; c++) {
            for (let r = 0; r < size - 2; r++) {
                const type = this.grid[r][c].type;
                if (this.grid[r + 1][c].type === type && this.grid[r + 2][c].type === type) {
                    matches.add(this.grid[r][c]);
                    matches.add(this.grid[r + 1][c]);
                    matches.add(this.grid[r + 2][c]);
                }
            }
        }

        return Array.from(matches);
    }

    async processMatches(matches) {
        // Calculate Score
        const points = matches.length * 10 + (matches.length > 3 ? (matches.length - 3) * 20 : 0);
        this.levelScore += points;
        this.score += points; // Total score
        this.updateHUD();

        // Animate removal
        matches.forEach(tile => {
            tile.el.classList.add('match');
            this.createParticles(tile.el);
        });

        await new Promise(r => setTimeout(r, 300));

        // Remove from grid logic
        matches.forEach(tile => {
            this.grid[tile.row][tile.col] = null;
            tile.el.remove();
        });

        await this.collapseGrid();
    }

    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            document.body.appendChild(particle);

            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            const tx = Math.cos(angle) * 50 * velocity;
            const ty = Math.sin(angle) * 50 * velocity;

            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;

            // Color based on particle type? For now white glow
            particle.style.background = 'white';
            particle.style.boxShadow = '0 0 10px white';

            const animation = particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
            ], {
                duration: 500 + Math.random() * 300,
                easing: 'cubic-bezier(0, .9, .57, 1)',
            });

            animation.onfinish = () => particle.remove();
        }
    }

    async collapseGrid() {
        const size = this.levelConfig.gridSize;

        // 1. Record current positions of all existing tiles
        const prePositions = new Map();
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (this.grid[r][c]) {
                    const rect = this.grid[r][c].el.getBoundingClientRect();
                    prePositions.set(this.grid[r][c].el, rect);
                }
            }
        }

        // 2. Update Grid Logic (Move down and Refill)
        const newTiles = [];

        // Move tiles down
        for (let c = 0; c < size; c++) {
            for (let r = size - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    // Find nearest tile above
                    for (let k = r - 1; k >= 0; k--) {
                        if (this.grid[k][c] !== null) {
                            const tile = this.grid[k][c];
                            this.grid[r][c] = tile;
                            this.grid[k][c] = null;
                            tile.row = r;
                            tile.el.dataset.row = r;
                            break;
                        }
                    }
                }
            }
        }

        // Refill top
        for (let c = 0; c < size; c++) {
            for (let r = 0; r < size; r++) {
                if (this.grid[r][c] === null) {
                    const type = Math.floor(Math.random() * this.levelConfig.colors);
                    const tile = this.createTileElement(r, c, type);
                    this.grid[r][c] = { type, el: tile, row: r, col: c };
                    newTiles.push(tile);
                }
            }
        }

        // 3. Re-render DOM to match new Grid State
        this.gridEl.innerHTML = '';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const tile = this.grid[r][c];
                tile.el.classList.remove('new', 'match');
                tile.el.style.transform = '';
                this.gridEl.appendChild(tile.el);
            }
        }

        // 4. FLIP Animation
        // For existing tiles that moved:
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const tile = this.grid[r][c];
                if (newTiles.includes(tile.el)) {
                    // New tile: Animate falling from above or popping in
                    // Let's make them fall from top of board or just above their position
                    tile.el.classList.add('new');
                } else {
                    // Existing tile
                    const oldRect = prePositions.get(tile.el);
                    if (oldRect) {
                        const newRect = tile.el.getBoundingClientRect();
                        const dy = oldRect.top - newRect.top;
                        const dx = oldRect.left - newRect.left;

                        if (dy !== 0 || dx !== 0) {
                            // Invert
                            tile.el.style.transform = `translate(${dx}px, ${dy}px)`;
                            tile.el.style.transition = 'none';

                            // Play
                            requestAnimationFrame(() => {
                                tile.el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
                                tile.el.style.transform = '';
                            });
                        }
                    }
                }
            }
        }

        await new Promise(r => setTimeout(r, 350)); // Wait for animations

        // Check for cascading matches
        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        } else {
            this.checkLevelStatus();
        }
    }

    checkLevelStatus() {
        if (this.levelScore >= this.levelConfig.target) {
            // Unlock next level
            if (this.currentLevelIndex + 1 === this.unlockedLevels && this.unlockedLevels < LEVELS.length) {
                this.unlockedLevels++;
            }

            setTimeout(() => {
                document.getElementById('level-score').textContent = this.levelScore;
                this.showScreen(this.levelCompleteScreen);
            }, 500);
        } else if (this.moves <= 0) {
            setTimeout(() => {
                this.showScreen(this.gameOverScreen);
            }, 500);
        }
    }

    showScreen(screen) {
        this.hideAllScreens();
        screen.classList.add('active');
    }

    hideAllScreens() {
        [this.startScreen, this.levelSelectScreen, this.rulesScreen, this.levelCompleteScreen, this.gameOverScreen, this.victoryScreen].forEach(s => {
            s.classList.remove('active');
        });
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Game();
        console.log("Game initialized");
    } catch (e) {
        alert("Error starting game: " + e.message);
        console.error(e);
    }
});
