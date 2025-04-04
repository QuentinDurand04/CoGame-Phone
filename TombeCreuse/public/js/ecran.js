$(function () {
    // création d'une connexion websocket
    const socket = io();
    // envoyer un message pour s'identifier
    socket.emit('identify', {type: 'ecran'});
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    //liste des joueurs
    let players = [];
    let isGameStarted = false; // Track the game state
    let progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'none';
    // qr code
    const qrcode = new QRCode(document.getElementById('qrcode'), {
        text: 'http://docketu.iutnc.univ-lorraine.fr:28332/manette',
        width: 128,
        height: 128,
        colorDark: '#000',
        colorLight: '#fff',
    });
    // Quand un joueur se reconnecte avec un nouvel ID
    socket.on('updatePlayerID', (info) => {
        // Trouver et mettre à jour le joueur dans le tableau local
        let playerIndex = players.findIndex(player => player.id === info.oldID);
        if (playerIndex !== -1) {
            players[playerIndex].id = info.newID;
        }
    });
    // Charger une seule fois l'image de lave
    const laveImage = new Image();
    laveImage.src = 'images/lave.jpg';

    // fonction pour dessiner les joueurs
    function dessinerJoueurs() {
        players.forEach((p) => {
            if (!p.collision) {
                dessinerJoueur(p);
            }
        });
    }

    // fonction pour dessiner un joueur
    function dessinerJoueur(player) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, 20, 20);
    }

    socket.on('changePseudoServ', (info) => {
        // Find and update the player in the local players array
        let playerIndex = players.findIndex(player => player.id === info.id);
        if (playerIndex !== -1) {
            players[playerIndex].pseudo = info.pseudo;
        }
    });

    // quand le serveur envoie un message pour la collision
    socket.on('collision', (playerCollison) => {
        // mettre à jour la collision du joueur
        let player = players.find(player => player.id === playerCollison.id);
        player.collision = true;
        player.score = playerCollison.score;
        // si tous les joueurs sont en collision, finir le jeu
        if (players.every(player => player.collision)) {
            isGameStarted = false;
            // afficher un message de fin de partie
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '24px serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            // afficher le score des 10 meilleurs joueurs
            ctx.fillText('Score des 10 meilleurs joueurs', canvas.width / 2, canvas.height / 3 - 50);
            ctx.font = '12px serif';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            players.sort((a, b) => b.score - a.score);
            players.slice(0, 10).forEach((player, index) => {
                ctx.fillText(player.pseudo + ' : ' + player.score, canvas.width / 2, canvas.height / 3 + index * 30);
            });
        } else {
            // sinon, effacer le joueur en collision
            ctx.clearRect(player.x, player.y, 20, 20);
            // dessiner les joueurs
            dessinerJoueurs();
        }
    });

    // quand le serveur envoie un message pour finir le jeu
    socket.on('endGame', () => {
        isGameStarted = false;
    });

    // quand le serveur envoie un message pour commencer le jeu
    socket.on('startGame', () => {
        isGameStarted = true;
        // clear le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // dessiner les joueurs
        dessinerJoueurs();
    });

    socket.on('waitingForRestart', () => {
        progressBar.style.display = 'block';
        // add 1 to the progress bar every second until it reaches 10
        let progress = 0;
        let id = setInterval(frame, 1000);
        function frame() {
            if (progress === 9) {
                clearInterval(id);
                progressBar.style.display = 'none';
            } else {
                progress++;
                progressBar.value = progress;
            }
        }
    });

    socket.on('restartGame', () => {
        isGameStarted = true;
        players.forEach(player => player.collision = false);
        // clear le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // dessiner les joueurs
        dessinerJoueurs();
    });

    // quand le serveur envoie un message pour dessiner la lave
    socket.on('drawLave', (lave) => {
        // effacer la lave précédente
        ctx.clearRect(0, lave.y + lave.speed, lave.x, lave.LaveHauteur);
        ctx.clearRect(lave.x + lave.LaveEcart, lave.y + lave.speed, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
        // lave d'un côté
        ctx.drawImage(laveImage, 0, 0, 500, 500, 0, lave.y, lave.x, lave.LaveHauteur);
        // lave de l'autre côté
        ctx.drawImage(laveImage, 0, 0, 500, 500, lave.x + lave.LaveEcart, lave.y, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
    });

    // Mettre à jour le nombre de joueurs et de réponses
    socket.on('newPlayerEcran', (info) => {
        $('#playerCount').text('Joueurs dans la partie : ' + info.count);
        // ajouter un carré de couleur différente sur le canva pour chaque joueur
        let player = { id: info.id, color: info.color, x: 150, y: 50, collision: true, pseudo: info.pseudo };
        // si le jeu n'est pas commencé, dessiner le joueur
        if (!isGameStarted) {
            player = { id: info.id, color: info.color, x: 150, y: 50, collision: false, pseudo: info.pseudo };
            dessinerJoueur(player);
        }
        // ajouter le joueur à la liste des joueurs
        players.push(player);
    });

    // quand le serveur envoie un message de déconnexion d'un joueur
    socket.on('disconnectPlayer', (info) => {
        let player = players.find((p) => p.id === info.playerID);
        // suprimmer le joueur du tableau
        players = info.players
        $('#playerCount').text('Joueurs dans la partie : ' + players.length);
        // clear le canvas
        if (player) {
            ctx.clearRect(player.x, player.y, canvas.width, canvas.height);
        }
        // dessiner les joueurs
        dessinerJoueurs();
    });

    // quand le serveur envoie un message pour le déplacement des joueurs
    socket.on('slider', (info) => {
        let player = players.find((p) => p.id === info.playerID);
        players = info.players;
        if (player) {
            // clear le canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // dessiner les joueurs
            dessinerJoueurs();
        }
    });

    // Respond to game state requests from controllers
    socket.on('requestGameState', () => {
        socket.emit('gameState', { isGameStarted });
    });

});

