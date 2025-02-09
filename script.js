class FlappyBird {
    constructor() {
        this.bird = document.getElementById('bird');
        this.gameContainer = document.getElementById('game');
        this.scoreElement = document.getElementById('score');
        this.startMessage = document.getElementById('start-message');
        this.gameOverMessage = document.getElementById('game-over');
        
        // Physics tuning - adjusted to match classic Flappy Bird
        this.GRAVITY = 0.4;
        this.JUMP_STRENGTH = -7;
        this.PIPE_SPEED = 3;         // Slightly faster pipes
        this.PIPE_GAP = 130;         // Classic gap size
        this.PIPE_INTERVAL = 1800;   // Faster pipe spawning
        this.GROUND_HEIGHT = 112;
        this.BIRD_HEIGHT = 24;
        
        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.pipes = [];
        this.lastTime = null;
        this.animationFrame = null;
        this.pipeGenerator = null;
        
        // Add cloud properties
        this.clouds = [];
        this.CLOUD_INTERVAL = 6000; // Reduced to 6 seconds
        this.CLOUD_SPEEDS = [8, 10, 12]; // Faster speeds in seconds
        
        // Calculate initial position
        requestAnimationFrame(() => {
            const playableHeight = this.gameContainer.clientHeight - this.GROUND_HEIGHT;
            this.startY = playableHeight * 0.5;
            this.birdY = this.startY;
            this.updateBirdPosition();
        });
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleInput = this.handleInput.bind(this);
        
        // Event listeners
        window.addEventListener('keydown', this.handleInput);
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
            if (!this.isPlaying) {
                this.start();
            }
        });
        
        // Set initial state
        this.reset();
        
        // Start cloud generation
        this.createCloud();
        this.cloudGenerator = setInterval(() => this.createCloud(), this.CLOUD_INTERVAL);
    }

    handleInput(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            if (!this.isPlaying) {
                this.start();
            } else {
                this.jump();
            }
        }
    }

    start() {
        if (this.isPlaying) return;
        
        // Reset state
        this.reset();
        this.isPlaying = true;
        
        // Hide messages
        this.startMessage.style.opacity = '0';
        this.gameOverMessage.style.opacity = '0';
        
        // Start game loop after a short delay
        setTimeout(() => {
            this.startMessage.style.display = 'none';
            this.gameOverMessage.style.display = 'none';
            
            // Initial state
            this.lastTime = performance.now();
            this.birdY = this.startY;
            this.birdVelocity = 0;
            
            // Start systems
            this.updateBirdPosition();
            this.animationFrame = requestAnimationFrame(this.update);
            
            // Start pipe generation with delay
            setTimeout(() => {
                if (this.isPlaying) {
                    this.createPipe();
                    this.pipeGenerator = setInterval(() => {
                        if (this.isPlaying) {
                            this.createPipe();
                        }
                    }, this.PIPE_INTERVAL);
                }
            }, 1500);  // Delay first pipe
            
            // Initial jump
            setTimeout(() => {
                if (this.isPlaying) {
                    this.jump();
                }
            }, 50);
        }, 50);
    }

    updateBirdPosition() {
        const rotation = this.isPlaying ? Math.min(Math.max(-20, this.birdVelocity * 2), 60) : 0;
        const birdParts = this.bird.querySelector('.bird-parts');
        if (birdParts) {
            birdParts.style.transform = `rotate(${rotation}deg)`;
        }
        this.bird.style.top = `${this.birdY}px`;
    }

    update(currentTime) {
        if (!this.isPlaying) return;
        
        const deltaTime = this.lastTime ? Math.min((currentTime - this.lastTime) / 16, 3) : 1;
        this.lastTime = currentTime;
        
        this.birdVelocity += this.GRAVITY * deltaTime;
        this.birdY += this.birdVelocity * deltaTime;
        
        const rotation = Math.min(Math.max(-20, this.birdVelocity * 2), 60);
        const birdParts = this.bird.querySelector('.bird-parts');
        if (birdParts) {
            birdParts.style.transform = `rotate(${rotation}deg)`;
        }
        this.bird.style.top = `${this.birdY}px`;
        
        this.updatePipes(deltaTime);
        
        if (this.checkCollisions()) {
            this.gameOver();
            return;
        }
        
        this.animationFrame = requestAnimationFrame(this.update);
    }

    jump() {
        if (!this.isPlaying) return;
        this.birdVelocity = this.JUMP_STRENGTH;
        this.updateBirdPosition();
    }

    updatePipes(deltaTime) {
        this.pipes.forEach((pipe, index) => {
            pipe.x -= this.PIPE_SPEED * deltaTime;
            
            // Update pipe positions
            pipe.top.style.transform = `translateX(${pipe.x}px)`;
            pipe.bottom.style.transform = `translateX(${pipe.x}px)`;
            
            // Update score
            if (!pipe.scored && pipe.x < 50) {
                pipe.scored = true;
                this.score++;
                this.scoreElement.textContent = this.score;
            }
        });
        
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => {
            if (pipe.x < -60) {
                pipe.top.remove();
                pipe.bottom.remove();
                return false;
            }
            return true;
        });
    }
    
    createPipe() {
        const pipeTop = document.createElement('div');
        const pipeBottom = document.createElement('div');
        
        pipeTop.className = 'pipe pipe-top';
        pipeBottom.className = 'pipe pipe-bottom';
        
        // Add pipe caps
        const capTop = document.createElement('div');
        const capBottom = document.createElement('div');
        capTop.className = 'pipe-cap';
        capBottom.className = 'pipe-cap';
        pipeTop.appendChild(capTop);
        pipeBottom.appendChild(capBottom);
        
        // Calculate heights with more balanced constraints
        const minGapFromEdge = 80; // Increased edge buffer
        const playableHeight = this.gameContainer.clientHeight - this.GROUND_HEIGHT;
        const availableHeight = playableHeight - this.PIPE_GAP;
        const minHeight = minGapFromEdge;
        const maxHeight = availableHeight - minGapFromEdge;
        // Normalize pipe height distribution to use more of the vertical space
        const normalizedRandom = Math.pow(Math.random(), 1.5); // Bias towards higher gaps
        const height = minHeight + normalizedRandom * (maxHeight - minHeight);
        
        pipeTop.style.height = `${height}px`;
        pipeBottom.style.height = `${availableHeight - height}px`;
        
        // Set initial position
        const startX = this.gameContainer.clientWidth;
        pipeTop.style.transform = `translateX(${startX}px)`;
        pipeBottom.style.transform = `translateX(${startX}px)`;
        
        this.gameContainer.appendChild(pipeTop);
        this.gameContainer.appendChild(pipeBottom);
        
        this.pipes.push({
            x: startX,
            top: pipeTop,
            bottom: pipeBottom,
            scored: false
        });
    }
    
    checkCollisions() {
        const birdHeight = this.BIRD_HEIGHT;
        // Ground collision
        if (this.birdY + birdHeight > this.gameContainer.clientHeight - this.GROUND_HEIGHT) {
            return true;
        }
        
        // Ceiling collision
        if (this.birdY < 0) {
            return true;
        }
        
        // Pipe collisions
        return this.pipes.some(pipe => {
            const birdRect = this.bird.getBoundingClientRect();
            const topPipeRect = pipe.top.getBoundingClientRect();
            const bottomPipeRect = pipe.bottom.getBoundingClientRect();
            
            return (
                birdRect.right > topPipeRect.left &&
                birdRect.left < topPipeRect.right &&
                (birdRect.top < topPipeRect.bottom || birdRect.bottom > bottomPipeRect.top)
            );
        });
    }
    
    gameOver() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        // Stop game systems
        cancelAnimationFrame(this.animationFrame);
        clearInterval(this.pipeGenerator);
        
        // Show game over message with fade
        this.gameOverMessage.style.display = 'block';
        requestAnimationFrame(() => {
            this.gameOverMessage.style.opacity = '1';
        });
    }

    reset() {
        // Clear game state
        this.isPlaying = false;
        this.score = 0;
        const playableHeight = this.gameContainer.clientHeight - this.GROUND_HEIGHT;
        this.startY = playableHeight * 0.4; // Position bird at 40% of playable height
        this.birdY = this.startY;
        this.birdVelocity = 0;
        this.lastTime = null;
        this.scoreElement.textContent = '0';
        
        // Reset bird position and rotation
        const birdParts = this.bird.querySelector('.bird-parts');
        if (birdParts) {
            birdParts.style.transform = 'rotate(0deg)';
        }
        this.bird.style.top = `${this.startY}px`;
        
        // Reset messages
        this.startMessage.style.display = 'block';
        this.startMessage.style.opacity = '1';
        this.gameOverMessage.style.display = 'none';
        this.gameOverMessage.style.opacity = '0';
        
        // Clear pipes
        this.pipes.forEach(pipe => {
            pipe.top.remove();
            pipe.bottom.remove();
        });
        this.pipes = [];
        
        // Clear clouds
        this.clouds.forEach(cloud => cloud.remove());
        this.clouds = [];
        
        if (this.pipeGenerator) {
            clearInterval(this.pipeGenerator);
            this.pipeGenerator = null;
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.cloudGenerator) {
            clearInterval(this.cloudGenerator);
        }
        
        // Restart cloud generation
        this.createCloud();
        this.cloudGenerator = setInterval(() => this.createCloud(), this.CLOUD_INTERVAL);
    }

    createCloud() {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        
        // Random cloud size
        const width = 60 + Math.random() * 40;
        const height = width * 0.6;
        cloud.style.width = `${width}px`;
        cloud.style.height = `${height}px`;
        
        // Position at right edge
        cloud.style.left = '100%';
        
        // Random vertical position (avoid ground)
        const maxTop = (this.gameContainer.clientHeight - this.GROUND_HEIGHT) * 0.7;
        cloud.style.top = `${20 + Math.random() * maxTop}px`;
        
        // Random speed
        const duration = this.CLOUD_SPEEDS[Math.floor(Math.random() * this.CLOUD_SPEEDS.length)];
        cloud.style.animation = `moveCloud ${duration}s linear`;
        
        // Add to container
        const cloudsContainer = this.gameContainer.querySelector('.clouds-container');
        cloudsContainer.appendChild(cloud);
        
        // Remove cloud when animation ends
        cloud.addEventListener('animationend', () => {
            cloud.remove();
            this.clouds = this.clouds.filter(c => c !== cloud);
        });
        
        this.clouds.push(cloud);
    }
}

// Initialize game
window.onload = () => new FlappyBird();