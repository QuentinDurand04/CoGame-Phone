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
let playerSessions = {};

// Déplacer les variables de lave au niveau global
let globalLave = [];
const LaveHauteur = 20;
const LaveEcart = 100;
let frameCount = 0;
let speed = 1;
let animationId = null;

// Route pour servir les fichiers statiques
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/manette', (req, res) => res.sendFile(__dirname + '/public/manette.html'));
app.get('/ecran', (req, res) => res.sendFile(__dirname + '/public/ecran.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'));

// fonction pour dessiner la lave
function drawLave() {
    // ajouter une lave toutes les 90 frames, une valeur petite pour plus de difficulté
    if (frameCount % 90 === 0) {
        // taille aléatoire de la lave
        const pipeWidth = Math.floor(Math.random() * (320 - LaveEcart));
        globalLave.push({ y: 480, x: pipeWidth });
    }
    // envoyer la lave à tous les clients
    for (let i = globalLave.length - 1; i >= 0; i--) {
        // envoi
        io.emit('drawLave', { x: globalLave[i].x, y: globalLave[i].y, LaveHauteur: LaveHauteur, LaveEcart: LaveEcart, speed: speed, tab: globalLave, score: score });
        // déplacement de la lave
        globalLave[i].y -= speed;
        // supprimer la lave si elle est hors de l'écran
        if (globalLave[i].y + LaveHauteur < 0) {
            globalLave.splice(i, 1);
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
        animationId = requestAnimationFrame(draw);
        // si tous les joueurs sont éliminés, finir le jeu
    } else if (nbPlayersAlive === 0) {
        // envoyer un message de fin de partie à tous les clients et réinitialiser les variables
        io.emit('endGame');
        isGameStarted = false;
        speed = 1;
        frameCount = 0;
        globalLave.length = 0;
        score = 0;
        if (animationId) {
            clearTimeout(animationId);
            animationId = null;
        }
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

// quand un client se connecte
io.on('connection', (socket) => {
    let isController = false;
    let sessionID = null;

    // Demande d'état du jeu
    socket.on('requestGameState', () => {
        // Envoyer l'état actuel du jeu et des laves
        socket.emit('gameState', {
            isGameStarted: isGameStarted,
            laveState: globalLave,
            LaveHauteur: LaveHauteur,
            LaveEcart: LaveEcart,
            score: score
        });
    });

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
            if (!animationId) {
                draw();
            }
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
        if (player) {
            player.collision = info.collision;
            player.score = score;
            nbPlayersAlive--;
            // envoyer un message de collision à tous les clients
            io.emit('collision', { id: info.id, collision: info.collision, score: score });
        }
    });

    // quand le joueur clique sur le bouton "Fin"
    socket.on('endGameServ', () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        if (animationId) {
            clearTimeout(animationId);
            animationId = null;
        }
        // envoyer un message de fin de partie à tous les clients et réinitialiser les variables
        io.emit('endGame');
        isGameStarted = false;
        score = 0;
        speed = 1;
        frameCount = 0;
        globalLave.length = 0;
    });

    // quand un joueur se connecte
    socket.on('identify', info => {
        if (info.type === 'manette') {
            isController = true;

            // Nouvelle connexion, générer un ID de session
            sessionID = generateSessionID();
            playerSessions[sessionID] = socket.id;

            // Enregistrer l'identifiant de session
            let color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            let pseudo = info.pseudo ? info.pseudo : `Player ${players.length + 1}`;
            players.push({ id: socket.id, x: 150, y: 50, color: color, collision: false, pseudo: pseudo });
            nbPlayersAlive++;

            // Envoyer l'ID de session au client
            socket.emit('sessionID', { sessionID: sessionID });

            // Envoyer les informations du nouveau joueur
            io.emit('newPlayerEcran', { count: players.length, id: socket.id, color: color, collision: false, pseudo: pseudo });
            socket.emit('newPlayerManette', {
                playerID: socket.id,
                color: color,
                collision: false,
                LaveHauteur: LaveHauteur,
                LaveEcart: LaveEcart,
                laveState: globalLave,
                score: score
            });

            // Si le jeu n'est pas commencé
            if (!isGameStarted) {
                io.emit('waitingForHost');
            } else {
                // Si la partie est déjà en cours, marquer le joueur comme en collision
                const player = players.find(p => p.id === socket.id);
                if (player) {
                    player.collision = true;
                    socket.emit('gameInProgress', {
                        laveState: globalLave,
                        score: score
                    });
                }
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
    // À la déconnexion, nettoyer les données de session
    socket.on('disconnect', () => {
        if (isController) {
            console.log('Socket disconnected : ' + socket.id);

            // Supprimer le joueur de la liste
            players = players.filter(player => player.id !== socket.id);

            // Mettre à jour le nombre de joueurs en vie
            nbPlayersAlive = players.filter(player => !player.collision).length;

            // Si tous les joueurs sont morts, terminer la partie
            if (nbPlayersAlive === 0 && isGameStarted) {
                io.emit('endGame');
                isGameStarted = false;
                speed = 1;
                frameCount = 0;
                globalLave.length = 0;
                score = 0;
                if (animationId) {
                    clearTimeout(animationId);
                    animationId = null;
                }
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

            // Conserver l'ID de session pendant un certain temps (ex: 5 minutes)
            if (sessionID) {
                setTimeout(() => {
                    delete playerSessions[sessionID];
                }, 300000); // 5 minutes
            }

            // Envoyer un message de déconnexion à tous les clients
            io.emit('disconnectPlayer', { players: players, playerID: socket.id });
        }
    });
});

function generateSessionID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// démarrer le serveur
server.listen(3000, () => {
    console.log("Server is running");
});