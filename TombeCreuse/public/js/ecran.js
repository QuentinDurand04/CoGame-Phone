$(function () {
    const socket = io();
    socket.emit('identify', 'ecran');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    //liste des joueurs
    let players = [];
    let isGameStarted = false;

    socket.on('idRoom', (room) => {
        $('#room').text('id de la room : ' + room);
    });

    function dessinerJoueurs() {
        players.forEach((p) => {
            if (!p.collision) {
                dessinerJoueur(p);
            }
        });
    }

    function dessinerJoueur(player) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, 20, 20);
    }

    socket.on('collision', (playerCollison) => {
        let player = players.find(player => player.id === playerCollison.id);
        player.collision = true;
        //if all players are dead
        if (players.every(player => player.collision)) {
            isGameStarted = false;
            document.getElementById('startGame').disabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '48px serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        } else {
            // Clear le canvas
            ctx.clearRect(player.x, player.y, 20, 20);
            // Dessiner les joueurs
            dessinerJoueurs();
        }
    });

    document.getElementById('startGame').addEventListener('click', function() {
        socket.emit('startGameServ');
    });
    document.getElementById('endGame').addEventListener('click', function() {
        socket.emit('endGameServ');
    });

    socket.on('endGame', () => {
        isGameStarted = false;
        document.getElementById('startGame').disabled = false;
    });

    socket.on('startGame', () => {
        isGameStarted = true;
        document.getElementById('startGame').disabled = true;
        // clear le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // dessiner les joueurs
        dessinerJoueurs();
    });

    //dessiner les laves
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
        //ajouter un carré de couleur différente sur le canva pour chaque joueur
        let player = {id: info.id, color: info.color, x: 150, y: 50, collision: true};
        if (!isGameStarted) {
            player = {id: info.id, color: info.color, x: 150, y: 50, collision: false};
            dessinerJoueur(player);
        }
        players.push(player);
    });

    socket.on('disconnectPlayer', (info) => {
        let player = players.find((p) => p.id === info.playerID);
        //suprimmer le joueur du tableau
        players = info.players
        $('#playerCount').text('Joueurs dans la partie : ' + players.length);
        // Clear le canvas
        if(player){
            ctx.clearRect(player.x, player.y, canvas.width, canvas.height);
        }
        // Dessiner les joueurs
        dessinerJoueurs();
    });

    socket.on('slider', (info) => {
        let player = players.find((p) => p.id === info.playerID);
        players = info.players;
        if (player) {
            // Clear le canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Dessiner les joueurs
            dessinerJoueurs();
        }
    });

});