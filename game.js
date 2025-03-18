// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const highScoreElement = document.getElementById('high-score');
const startButton = document.getElementById('start-button');
const welcomeScreen = document.getElementById('welcome-screen');
const gameUI = document.getElementById('game-ui');

// Game settings
const PLAYER_WIDTH = 70;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 7;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 15;
const BULLET_SPEED = 10;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_SPACING = 15;
const ENEMY_DROP = 15;
const PLAYER_LIVES = 3;

// Game state
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let gameRunning = false;
let gamePaused = false;
let lastTime = 0;
let enemyDirection = 1;
let enemyMoveDown = false;
let lives = PLAYER_LIVES;
let currentLevel = 1;
let enemySpeed = 0.5;
let enemyShootingRate = 0.01;
let enemyBulletSpeed = BULLET_SPEED / 3;

// Update high score display
highScoreElement.textContent = highScore;

// Game objects
const player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - PLAYER_HEIGHT - 10,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
    isMovingLeft: false,
    isMovingRight: false
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let explosions = [];

// Create a level-up message element
const levelUpMsg = document.createElement('div');
levelUpMsg.className = 'level-up';
document.querySelector('.game-container').appendChild(levelUpMsg);

// Initialize enemies
function initEnemies() {
    enemies = [];
    const startX = (canvas.width - (ENEMY_COLS * (ENEMY_WIDTH + ENEMY_SPACING))) / 2;
    const startY = 50;

    for (let row = 0; row < ENEMY_ROWS; row++) {
        for (let col = 0; col < ENEMY_COLS; col++) {
            enemies.push({
                x: startX + col * (ENEMY_WIDTH + ENEMY_SPACING),
                y: startY + row * (ENEMY_HEIGHT + ENEMY_SPACING),
                width: ENEMY_WIDTH,
                height: ENEMY_HEIGHT,
                type: row % 3, // Different types of enemies (0, 1, or 2)
                moving: true
            });
        }
    }
}

// Event listeners for controls
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    
    if (e.key === 'ArrowLeft') player.isMovingLeft = true;
    if (e.key === 'ArrowRight') player.isMovingRight = true;
    if (e.key === ' ' && !gameOver && !gamePaused) fireBullet();
    if (e.key === 'Enter' && gameOver) resetGame();
    if (e.key === 'p') togglePause();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') player.isMovingLeft = false;
    if (e.key === 'ArrowRight') player.isMovingRight = false;
});

startButton.addEventListener('click', startGame);

// Game functions
function startGame() {
    welcomeScreen.style.display = 'none';
    gameUI.style.display = 'flex';
    gameRunning = true;
    gamePaused = false;
    resetGame();
}

function togglePause() {
    gamePaused = !gamePaused;
    if (gamePaused) {
        // Show pause message
        ctx.fillStyle = 'white';
        ctx.font = '36px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px "Press Start 2P", cursive';
        ctx.fillText('Press P to continue', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function fireBullet() {
    bullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: BULLET_SPEED
    });
}

function fireEnemyBullet() {
    if (enemies.length > 0 && Math.random() < enemyShootingRate) {
        const shooter = enemies[Math.floor(Math.random() * enemies.length)];
        enemyBullets.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            speed: enemyBulletSpeed
        });
    }
}

function updatePlayer() {
    if (player.isMovingLeft) {
        player.x -= player.speed;
        if (player.x < 0) player.x = 0;
    }
    if (player.isMovingRight) {
        player.x += player.speed;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    }
}

function updateBullets() {
    // Update player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].y += enemyBullets[i].speed;
        if (enemyBullets[i].y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    let moveDown = false;
    let moveDirection = enemyDirection;

    // Check if enemies should change direction
    for (const enemy of enemies) {
        if ((enemyDirection > 0 && enemy.x + enemy.width + enemySpeed >= canvas.width) ||
            (enemyDirection < 0 && enemy.x - enemySpeed <= 0)) {
            moveDown = true;
            moveDirection *= -1;
            break;
        }
    }

    // Update enemy positions
    enemies.forEach(enemy => {
        enemy.x += enemySpeed * moveDirection;
        if (moveDown) {
            enemy.y += ENEMY_DROP;
        }
    });

    if (moveDown) {
        enemyDirection = moveDirection;
    }
    
    // Check for game over (enemies reach bottom)
    for (const enemy of enemies) {
        if (enemy.y + enemy.height >= player.y) {
            gameOver = true;
            updateHighScore();
            break;
        }
    }
}

// Check collisions
function checkCollisions() {
    // Check bullet-enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                // Hit detected
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += (3 - enemy.type) * 10; // Higher score for enemies in front rows
                scoreElement.textContent = score;
                break;
            }
        }
    }

    // Check enemy bullet-player collisions
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
        ) {
            // Remove the bullet
            enemyBullets.splice(i, 1);
            
            // Reduce lives instead of immediate game over
            lives--;
            livesElement.textContent = lives;
            
            if (lives <= 0) {
                gameOver = true;
                updateHighScore();
            }
            break;
        }
    }
    
    // Check if all enemies are destroyed - next level
    if (enemies.length === 0) {
        nextLevel();
    }
}

function nextLevel() {
    currentLevel++;
    levelElement.textContent = currentLevel;
    
    // Show level up message
    levelUpMsg.textContent = `LEVEL ${currentLevel}`;
    levelUpMsg.classList.add('show');
    setTimeout(() => {
        levelUpMsg.classList.remove('show');
    }, 2000);
    
    // Increase difficulty
    enemySpeed = Math.min(2, enemySpeed * 1.2);
    enemyShootingRate = Math.min(0.03, enemyShootingRate * 1.2);
    
    // Bonus points for completing a level
    score += currentLevel * 100;
    scoreElement.textContent = score;
    
    // Reset enemies for next level
    initEnemies();
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw player
    ctx.fillStyle = '#0F0';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player bullets
    ctx.fillStyle = '#FFF';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemy bullets
    ctx.fillStyle = '#F00';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        // Different colors for different enemy types
        switch(enemy.type) {
            case 0: ctx.fillStyle = '#FF0000'; break; // Red
            case 1: ctx.fillStyle = '#FF7F00'; break; // Orange
            case 2: ctx.fillStyle = '#FFFF00'; break; // Yellow
            default: ctx.fillStyle = '#FFFFFF';
        }
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
    
    // Draw pause screen
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '36px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px "Press Start 2P", cursive';
        ctx.fillText('Press P to continue', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Draw game over message
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '36px "Press Start 2P", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '16px "Press Start 2P", cursive';
        ctx.fillText('Press Enter to restart', canvas.width / 2, canvas.height / 2 + 40);
        
        if (score > highScore - score) {
            ctx.fillStyle = '#FF0';
            ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 - 50);
        }
    }
}

function resetGame() {
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    gamePaused = false;
    bullets = [];
    enemyBullets = [];
    enemyDirection = 1;
    lives = PLAYER_LIVES;
    livesElement.textContent = lives;
    currentLevel = 1;
    levelElement.textContent = currentLevel;
    enemySpeed = 0.5;
    enemyShootingRate = 0.01;
    
    player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
    
    initEnemies();
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    // Only update game state if the game is running and not paused
    if (gameRunning && !gameOver && !gamePaused) {
        updatePlayer();
        updateBullets();
        updateEnemies();
        fireEnemyBullet();
        checkCollisions();
    }
    
    // Always draw
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Set initial display states
gameUI.style.display = 'none';
welcomeScreen.style.display = 'flex';

// Initialize game
initEnemies();
levelElement.textContent = currentLevel;
livesElement.textContent = lives;
requestAnimationFrame(gameLoop);
