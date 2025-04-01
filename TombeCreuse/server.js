const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

// fonction pour simuler requestAnimationFrame
global.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 1000 / 120); // 120 FPS
};

let players = [];
let isGameStarted = false;
let nbPlayersAlive = 0;
let timeout;
let score = 0;

// Route pour servir les fichiers statiques
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/manette', (req, res) => res.sendFile(__dirname + '/public/manette.html'));
app.get('/ecran', (req, res) => res.sendFile(__dirname + '/public/ecran.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'));

// quand un client se connecte
io.on('connection', (socket) => {
    let isController = false;
    // liste des laves
    let Lave = [];
    const LaveHauteur = 20;
    const LaveEcart = 100;
    let frameCount = 0;
    let speed = 2;

    // fonction pour dessiner la lave
    function drawLave() {
        // ajouter une lave toutes les 90 frames, une valeur petite pour plus de difficulté
        if (frameCount % 90 === 0) {
            // taille aléatoire de la lave
            const pipeWidth = Math.floor(Math.random() * (320 - LaveEcart));
            Lave.push({ y: 480, x: pipeWidth });
        }
        // envoyer la lave à tous les clients
        for (let i = Lave.length - 1; i >= 0; i--) {
            // envoi
            io.emit('drawLave', { x: Lave[i].x, y: Lave[i].y, LaveHauteur: LaveHauteur, LaveEcart: LaveEcart, speed: speed, tab: Lave, score: score });
            // déplacement de la lave
            Lave[i].y -= speed;
            // supprimer la lave si elle est hors de l'écran
            if (Lave[i].y + LaveHauteur < 0) {
                Lave.splice(i, 1);
            }
        }
    }

    // fonction pour dessiner la lave en boucle
    function draw() {
        // dessiner la lave si le jeu est en cours
        if (isGameStarted && nbPlayersAlive > 0) {
            score += 0.1;
            // arrondir le score à 2 décimales
            score = Math.round(score * 100) / 100;
            frameCount++;
            // augmenter la vitesse toutes les 100 frames
            if (frameCount % 100 === 0) {
                speed += 0.3;
            }
            drawLave();
            // boucle pour dessiner la lave
            requestAnimationFrame(draw);
            // si tous les joueurs sont éliminés, finir le jeu
        } else if (nbPlayersAlive === 0) {
            // envoyer un message de fin de partie à tous les clients et réinitialiser les variables
            io.emit('endGame');
            isGameStarted = false;
            speed = 2;
            frameCount = 0;
            Lave.length = 0;
            score = 0;
            io.emit('waitingForRestart');
            //wait 10 seconds before reseting the game
            timeout = setTimeout(() => {
                console.log('Restarting game');
                // si au moins un joueur est connecté
                if (players.length >= 1) {
                    // réinitialiser les variables
                    nbPlayersAlive = players.length;
                    players.forEach(player => player.collision = false);
                    // envoyer un message de début de partie à tous les clients
                    io.emit('restartGame');
                    isGameStarted = true;
                    // dessiner la lave
                    draw();
                }
            }, 10000);
        }
    }

    // quand le joueur clique sur le bouton "Commencer"
    socket.on('startGameServ', () => {
        // si au moins un joueur est connecté
        if (players.length >= 1) {
            // réinitialiser les variables
            nbPlayersAlive = players.length;
            players.forEach(player => player.collision = false);
            // envoyer un message de début de partie à tous les clients
            io.emit('startGame');
            isGameStarted = true;
            // dessiner la lave
            draw();
        }
    });

    socket.on('changePseudo', (info) => {
        // Find and update the player in the players array
        let playerIndex = players.findIndex(player => player.id === info.id);
        if (playerIndex !== -1) {
            players[playerIndex].pseudo = info.pseudo;
            // Broadcast the updated pseudo to all clients
            io.emit('changePseudoServ', { id: info.id, pseudo: info.pseudo });
        }
    });

    // quand un joueur est en collision
    socket.on('collisionServ', (info) => {
        // mettre à jour la collision du joueur et le nombre de joueurs en vie
        let player = players.find(player => player.id === info.id);
        player.collision = info.collision;
        player.score = score;
        nbPlayersAlive--;
        // envoyer un message de collision à tous les clients
        io.emit('collision', { id: info.id, collision: info.collision, score: score });
    });

    // quand le joueur clique sur le bouton "Fin"
    socket.on('endGameServ', () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        // envoyer un message de fin de partie à tous les clients et réinitialiser les variables
        io.emit('endGame');
        isGameStarted = false;
        score = 0;
        speed = 2;
        frameCount = 0;
        Lave.length = 0;
    });

    // quand un joueur se connecte
    socket.on('identify', info => {
        // si le joueur est une manette
        if (info.type === 'manette') {
            // ajouter le joueur à la liste des joueurs et définir la couleur
            isController = true;
            let color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            let pseudo = info.pseudo ? info.pseudo : socket.id;
            players.push({ id: socket.id, x: 150, y: 50, color: color, collision: false, pseudo: pseudo });
            nbPlayersAlive++;
            // envoyer un message de nouveux joueur
            io.emit('newPlayerEcran', { count: players.length, id: socket.id, color: color, collision: false, pseudo: pseudo });
            io.emit('newPlayerManette', { playerID: socket.id, color: color, collision: false, LaveHauteur: LaveHauteur, LaveEcart: LaveEcart });
            // si le jeu n'est pas commencé, envoyer un message "En attente de l'hôte"
            if (!isGameStarted || !isGameStarted && players.length < 1) {
                io.emit('waitingForHost');
            }
        }
    });

    //quand le joueur bouge le slider
    socket.on('sliderServ', (info) => {
        // mettre à jour la position du joueur
        let x = info.value;
        players.forEach(player => {
            if (player.id === info.id) {
                player.x = info.value;
            }
        });
        // envoyer la nouvelle position à tous
        io.emit('slider', { players: players, playerID: info.id, x: x });
    });

    // quand un joueur se déconnecte
    socket.on('disconnect', () => {
        if (isController) {
            console.log('Socket disconnected : ' + socket.id);
            // supprimer le joueur de la liste
            players = players.filter(player => player.id !== socket.id);
            // envoyer un message de déconnexion à tous les clients
            io.emit('disconnectPlayer', { players: players, playerID: socket.id });
        }
    });
});

// démarrer le serveur
server.listen(3000, () => {
    console.log("Server is running");
});
