const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

global.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 1000 / 120); // 120 FPS
};

let players = [];
let isGameStarted = false;
let room;
let nbPlayersAlive = 0;

// Route pour servir les fichiers statiques
app.use(express.static('public'));

app.get('/manette', (req, res) => res.sendFile(__dirname + '/public/manette.html'));
app.get('/ecran', (req, res) => res.sendFile(__dirname + '/public/ecran.html'));

room = Math.floor(Math.random() * 1000);
io.on('connection', (socket) => {
    let isController = false;
    //liste des laves
    let Lave = [];
    const LaveHauteur = 20;
    const LaveEcart = 100;
    let frameCount = 0;
    let speed = 2;
                
    function drawLave() {
        if (frameCount % 90 === 0) {
            const pipeWidth = Math.floor(Math.random() * (320 - LaveEcart));
            Lave.push({ y: 480, x: pipeWidth });
        }
        for (let i = Lave.length - 1; i >= 0; i--) {
            io.emit('drawLave', {x: Lave[i].x, y: Lave[i].y, LaveHauteur: LaveHauteur, LaveEcart: LaveEcart, speed: speed, tab: Lave});
            Lave[i].y -= speed;
            if (Lave[i].y + LaveHauteur < 0) {
                Lave.splice(i, 1);
            }
        }
    }

    function draw() {
        if (isGameStarted && nbPlayersAlive > 0) {
            drawLave();
            frameCount++;
            if (frameCount % 100 === 0) {
                speed += 0.3; // More gradual speed increase
            }
            requestAnimationFrame(draw);
        } else if (nbPlayersAlive === 0) {
            io.emit('endGame');
            isGameStarted = false;
            speed = 2;
            frameCount = 0;
            Lave.length = 0;
        }
    }

    socket.on('startGameServ', () => {
        if (players.length >= 1) {
            nbPlayersAlive = players.length;
            players.forEach(player => player.collision = false);
            io.emit('startGame');
            isGameStarted = true;
            draw();
        }
    });

    socket.on('collisionServ', (info) => {
        let player = players.find(player => player.id === info.id);
        console.log(info);
        console.log(player);
        player.collision = info.collision;
        nbPlayersAlive--;
        io.emit('collision', {id: info.id, collision: info.collision});
    });

    socket.on('endGameServ', () => {
        io.emit('endGame');
        isGameStarted = false;
        speed = 2;
        frameCount = 0;
        Lave.length = 0;
    });

    socket.on('identify', (type) => {
        if (type === 'manette') {
            console.log(socket.id);
            socket.join(room);
            isController = true;
            let color = '#' + Math.floor(Math.random()*16777215).toString(16);
            players.push({id: socket.id, x: 150, y: 50, color: color, collision: false});
            nbPlayersAlive++;
            io.emit('idRoom', room);
            io.emit('newPlayerEcran', {count: players.length, id: socket.id, color: color, collision: false});
            io.emit('newPlayerManette', {playerID: socket.id, color: color, collision: false, LaveHauteur: LaveHauteur, LaveEcart: LaveEcart});
            if (!isGameStarted || !isGameStarted && players.length < 1) {
                io.emit('waitingForHost'); // Envoie "En attente de l'hôte" à la manette
            }
        }
    });

    //quand le joueur bouge le slider
    socket.on('sliderServ', (info) => {
        console.log(info);
        //update player position
        let x = info.value;
        players.forEach(player => {
            if (player.id === info.id) {
                player.x = info.value;
            }
        });
        io.emit('slider', {players : players, playerID : info.id, x : x});
    });

    socket.on('disconnect', () => {
        if (isController) {
            console.log('Socket disconnected : ' + socket.id);
            //remove player from array
            players = players.filter(player => player.id !== socket.id);
            //send to all players the updated player list
            io.emit('disconnectPlayer', {players : players, playerID : socket.id});
        }
    });
});


server.listen(8003, () => {
    console.log("Server is running on http://localhost:8003");
});
