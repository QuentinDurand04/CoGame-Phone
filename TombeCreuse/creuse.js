document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('slider');
    const Fossoyeur = {
        x: 150,
        y: 50,
        width: 20,
        height: 20,
        velocity: 0,
        show: function() {
            ctx.fillStyle = 'grey';
            ctx.fillRect(this.x, this.y, this.width, this.height);
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

    function drawLave() {
        lave = new Image();
        lave.src = './images/lave.jpg';
        if (frameCount % 90 === 0) {
            const pipeWidth = Math.floor(Math.random() * (canvas.width - LaveEcart));
            Lave.push({ y: canvas.height, x: pipeWidth });
        }
        for (let i = Lave.length - 1; i >= 0; i--) {
            ctx.drawImage(lave, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
            ctx.drawImage(lave, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
            Lave[i].y -= 2;
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
        Fossoyeur.show();
        Fossoyeur.update();
        drawLave();
        if (checkCollision()) {
            alert('Game Over');
            return;
        }
        frameCount++;
        requestAnimationFrame(draw);
    }

    slider.addEventListener('input', function() {
        Fossoyeur.setPosition(parseInt(this.value));
    });

    draw();
});