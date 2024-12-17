document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('slider');
    const speedDisplay = document.getElementById('speed');
    const scoreDisplay = document.getElementById('score');
    let score = 1;
    speedDisplay.innerHTML = 'Speed : 2';
    let trail = [];
    const maxTrailLength = 70; // Adjust the length of the trail
    const Fossoyeur = {
        x: 150,
        y: 50,
        width: 20,
        height: 20,
        velocity: 0,
        show: function() {
            let img = new Image();
            img.src = './images/drill.jpg';
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
        },
        update: function() {
            this.x += this.velocity;
            if (this.x > canvas.width - this.width) {
                this.x = canvas.width - this.width;
                this.velocity = 0;
            }
            if (this.x < 0) {
                this.x = 0;
                this.velocity = 0;
            }
        },
        setPosition: function(newX) {
            this.x = newX;
        }
    };

    const Lave = [];
    const LaveHauteur = 20;
    const LaveEcart = 100;
    let frameCount = 0;
    let speed = 2;

    function drawLave() {
        let lave = new Image();
        lave.src = './images/lave.jpg';
        if (frameCount % 90 === 0) {
            const pipeWidth = Math.floor(Math.random() * (canvas.width - LaveEcart));
            Lave.push({ y: canvas.height, x: pipeWidth });
        }
        for (let i = Lave.length - 1; i >= 0; i--) {
            ctx.drawImage(lave, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
            ctx.drawImage(lave, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
            Lave[i].y -= speed;
            if (Lave[i].y + LaveHauteur < 0) {
                Lave.splice(i, 1);
            }
        }
    }

    function checkCollision() {
        for (let i = 0; i < Lave.length; i++) {
            if (Fossoyeur.y < Lave[i].y + LaveHauteur &&
                Fossoyeur.y + Fossoyeur.height > Lave[i].y &&
                (Fossoyeur.x < Lave[i].x || Fossoyeur.x + Fossoyeur.width > Lave[i].x + LaveEcart)) {
                return true;
            }
        }
        return false;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Add current position to the trail
        trail.push({ x: Fossoyeur.x, y: Fossoyeur.y });
        if (trail.length > maxTrailLength) {
            trail.shift();
        }
        // Draw the trail
        ctx.beginPath();
        for (let i = 0; i < trail.length; i++) {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (i / (trail.length*4)) + ')'; // Fade effect
            ctx.fillRect(trail[i].x, trail[i].y--, Fossoyeur.width, Fossoyeur.height);
        }

        Fossoyeur.show();
        Fossoyeur.update();
        drawLave();
        if (checkCollision()) {
            alert('Game Over, score : ' + Math.floor(score));
            return;
        }
        frameCount++;
        if (frameCount % 200 === 0) {
            speed += 0.6; // More gradual speed increase
            speedDisplay.innerHTML = 'Speed : ' + speed;
        }
        score += 0.5;
        scoreDisplay.innerHTML = 'Score : ' + Math.floor(score);
        requestAnimationFrame(draw);
    }

    slider.addEventListener('input', function() {
        Fossoyeur.setPosition(parseInt(this.value));
    });


    let intervalId = null;

    document.addEventListener('keydown', function(event) {
        const step = 20; // Adjust the step size as needed
        if (event.key === 'q' || event.key === 'd') {
            if (intervalId === null) {
                intervalId = setInterval(() => {
                    if (event.key === 'q') {
                        slider.value = Math.max(0, parseInt(slider.value) - step);
                    } else if (event.key === 'd') {
                        slider.value = Math.min(320, parseInt(slider.value) + step);
                    }
                    Fossoyeur.setPosition(parseInt(slider.value));
                }, 40); // Adjust the interval time as needed
            }
        }
    });

    document.addEventListener('keyup', function(event) {
        if (event.key === 'q' || event.key === 'd') {
            clearInterval(intervalId);
            intervalId = null;
        }
    });

    draw();
});