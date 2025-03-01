$(function () {
    // création d'une connexion websocket
    const socket = io();
    // envoyer un message pour s'identifier
    socket.emit('identify', 'admin');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    //liste des joueurs
    let players = [];
    let isGameStarted = false;
    let progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'none';
    // qr code
    const qrcode = new QRCode(document.getElementById('qrcode'), {
        text: 'docketu.iutnc.univ-lorraine.fr:28332/manette',
        width: 128,
        height: 128,
        colorDark: '#000',
        colorLight: '#fff',
    });

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

    // quand le serveur envoie un message pour la collision
    socket.on('collision', (playerCollison) => {
        // mettre à jour la collision du joueur
        let player = players.find(player => player.id === playerCollison.id);
        player.collision = true;
        // si tous les joueurs sont en collision, finir le jeu
        if (players.every(player => player.collision)) {
            isGameStarted = false;
            document.getElementById('startGame').disabled = false;
            // afficher un message de fin de partie
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '48px serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        } else {
            // sinon, effacer le joueur en collision
            ctx.clearRect(player.x, player.y, 20, 20);
            // dessiner les joueurs
            dessinerJoueurs();
        }
    });

    // envoyer un message au serveur pour les clique sur le bouton "Commencer" et "Fin"
    document.getElementById('startGame').addEventListener('click', function () {
        socket.emit('startGameServ');
    });
    document.getElementById('endGame').addEventListener('click', function () {
        socket.emit('endGameServ');
    });

    // quand le serveur envoie un message pour finir le jeu
    socket.on('endGame', () => {
        isGameStarted = false;
        document.getElementById('startGame').disabled = false;
    });

    // quand le serveur envoie un message pour commencer le jeu
    socket.on('startGame', () => {
        isGameStarted = true;
        document.getElementById('startGame').disabled = true;
        // clear le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // dessiner les joueurs
        dessinerJoueurs();
    });

    socket.on('restartGame', () => {
        isGameStarted = true;
        document.getElementById('startGame').disabled = true;
        // clear le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // dessiner les joueurs
        dessinerJoueurs();
    });

    socket.on('waitingForRestart', () => {
        document.getElementById('startGame').disabled = true;
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

    // quand le serveur envoie un message pour dessiner la lave
    socket.on('drawLave', (lave) => {
        image = new Image();
        image.src = 'images/lave.jpg';
        // effacer la lave précédente
        ctx.clearRect(0, lave.y + lave.speed, lave.x, lave.LaveHauteur);
        ctx.clearRect(lave.x + lave.LaveEcart, lave.y + lave.speed, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
        // lave d'un côté
        ctx.drawImage(image, 0, 0, 500, 500, 0, lave.y, lave.x, lave.LaveHauteur);
        // lave de l'autre côté
        ctx.drawImage(image, 0, 0, 500, 500, lave.x + lave.LaveEcart, lave.y, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
    });

    // Mettre à jour le nombre de joueurs et de réponses
    socket.on('newPlayerEcran', (info) => {
        $('#playerCount').text('Joueurs dans la partie : ' + info.count);
        // ajouter un carré de couleur différente sur le canva pour chaque joueur
        let player = { id: info.id, color: info.color, x: 150, y: 50, collision: true };
        // si le jeu n'est pas commencé, dessiner le joueur
        if (!isGameStarted) {
            player = { id: info.id, color: info.color, x: 150, y: 50, collision: false };
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

});