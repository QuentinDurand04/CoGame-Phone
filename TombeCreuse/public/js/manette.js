$(function () {
  // création d'une connexion websocket
  const socket = io();
  const pseudoInput = document.getElementById('pseudoInput');
  const pseudoButton = document.getElementById('pseudoButton');
  let pseudo = pseudoInput.value ? pseudoInput.value : null;

  // Récupérer l'ID de session du localStorage s'il existe
  let sessionID = localStorage.getItem('gameSessionID');

  // envoyer un message pour s'identifier
  socket.emit('identify', {type: 'manette', pseudo: pseudo, sessionID: sessionID});

  // Stocker l'ID de session lorsqu'on le reçoit
  socket.on('sessionID', (data) => {
    sessionID = data.sessionID;
    localStorage.setItem('gameSessionID', sessionID);
  });

  // Gérer la reconnexion
  socket.on('reconnectPlayer', (data) => {
    color = data.color;
    player.collision = data.collision;
    player.x = data.x;
    LaveHauteur = data.LaveHauteur;
    LaveEcart = data.LaveEcart;

    // Mise à jour de l'état des laves lors de la reconnexion
    if (data.laveState && data.laveState.length > 0) {
      Lave = data.laveState;
      // Dessiner toutes les laves existantes
      for (let i = 0; i < Lave.length; i++) {
        ctx.drawImage(laveImage, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
        ctx.drawImage(laveImage, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
      }
    }

    // Mettre à jour le slider
    slider.value = player.x;

    // Désactiver le slider si le joueur est en collision
    if (player.collision) {
      slider.disabled = true;
    }

    // Redessiner le joueur
    dessinerJoueur();
  });

  // Si une partie est déjà en cours à la connexion
  socket.on('gameInProgress', (data) => {
    isGameStarted = true;
    player.collision = true;
    slider.disabled = true;
    $('h1').text('Partie en cours - Attendez la prochaine partie');

    // Mise à jour de l'état des laves
    if (data && data.laveState && data.laveState.length > 0) {
      Lave = data.laveState;
      // Dessiner toutes les laves existantes
      for (let i = 0; i < Lave.length; i++) {
        ctx.drawImage(laveImage, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
        ctx.drawImage(laveImage, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
      }
    }
  });

  pseudoButton.addEventListener('click', () => {
    if (!isGameStarted) {
        pseudo = pseudoInput.value || `Player ${Math.floor(Math.random() * 1000)}`;
        pseudoInput.placeholder = 'Pseudo : ' + pseudo;
        socket.emit('changePseudo', { pseudo: pseudo, id: socket.id });
    }
  });

  // définition des variables
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let slider = document.getElementById('slider');
  let rand = Math.floor(Math.random() * 256);
  let color = 'rgb(' + rand + ',' + rand + ',' + rand + ')';
  let player = { x: 150, y: 50, width: 20, height: 20, collision: false, score: 0, pseudo: pseudo, color: color };
  let Lave = [];
  let LaveHauteur;
  let LaveEcart;
  let isGameStarted = false;
  let progressBar = document.getElementById('progressBar');
  progressBar.style.display = 'none';

  // Charger une seule fois l'image de lave
  const laveImage = new Image();
  laveImage.src = 'images/lave.jpg';

  // envoyer une requête au serveur pour changer la position du joueur si le joueur n'est pas éliminé
  document.getElementById('slider').addEventListener('input', function () {
    if (!player.collision && isGameStarted) {
      socket.emit('sliderServ', { value: this.value, id: socket.id });
    }
  });

  // fonction pour dessiner le joueur
  function dessinerJoueur(){
    ctx.fillStyle = color;
    ctx.fillRect(player.x, 50, 20, 20);
  }

  // fonction pour vérifier la collision
  function checkCollision() {
    // vérifier si le joueur est en collision avec la lave
    if (!(player.x >= Lave[0].x && player.x <= Lave[0].x + LaveEcart - 20) && Lave[0].y <= player.y && player.y <= Lave[0].y + LaveHauteur) {
      // changer la valeur de collision à true et envoyer un message au serveur
      slider.disabled = true;
      player.collision = true;
      socket.emit('collisionServ', { id: socket.id, collision: true });
      return;
    }
    player.collision = false;
  }

  socket.on('changePseudoServ', (info) => {
    if (info.id === socket.id) {
      player.pseudo = info.pseudo;
      pseudoInput.placeholder = 'Pseudo : ' + info.pseudo;
    }
  });

  // quand le serveur envoie un message pour dessiner la lave
  socket.on('drawLave', (lave) => {
    // si le joueur n'est pas en collision
    if (!player.collision) {
      // récupérer les informations de la lave
      Lave = lave.tab;
      // effacer la lave précédente
      ctx.clearRect(0, lave.y + lave.speed, lave.x, lave.LaveHauteur);
      ctx.clearRect(lave.x + lave.LaveEcart, lave.y + lave.speed, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
      // lave d'un côté
      ctx.drawImage(laveImage, 0, 0, 500, 500, 0, lave.y, lave.x, lave.LaveHauteur);
      // lave de l'autre côté
      ctx.drawImage(laveImage, 0, 0, 500, 500, lave.x + lave.LaveEcart, lave.y, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
      // vérifier la collision avec la nouvelle lave
      checkCollision();
      // si le joueur est en collision afficher un message de fin de partie
      if (player.collision) {
        //si le joueur n'a pas de score, lui donner le score
        if (player.score == 0) player.score = lave.score;
        console.log(player.score);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px serif';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px serif';
        ctx.fillStyle = 'black';
        ctx.fillText('Score : ' + player.score, canvas.width / 2, canvas.height / 2 + 50);
      }
    }
  });

  // quand le serveur envoie un message d'initialisation
  socket.on('newPlayerManette', (info) => {
    // si le joueur est le joueur actuel
    if (info.playerID === socket.id) {
      LaveHauteur = info.LaveHauteur;
      LaveEcart = info.LaveEcart;
      //ajouter un carré de couleur sur le canva
      color = info.color;

      // Mise à jour de l'état des laves
      if (info.laveState && info.laveState.length > 0) {
        Lave = info.laveState;
        // Dessiner toutes les laves existantes
        for (let i = 0; i < Lave.length; i++) {
          ctx.drawImage(laveImage, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
          ctx.drawImage(laveImage, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
        }
      }

      dessinerJoueur();
    }
  });

  // quand le serveur envoie un message d'attente
  socket.on('waitingForHost', () => {
    $('h1').text('En attente de l\'hôte');
  });

  function startGame() {
    isGameStarted = true;
    slider.disabled = false;
    pseudoButton.disabled = true;
    player.collision = false;
    player.score = 0;
    $('h1').text('Partie en cours');
    // clear le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // dessiner le joueur
    dessinerJoueur();
  }

  // quand le serveur envoie un message de début de partie
  socket.on('startGame', () => {
    startGame();
  });

  socket.on('restartGame', () => {
    startGame();
  });

  socket.on('waitingForRestart', () => {
    isGameStarted = false;
    pseudoButton.disabled = false;
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

  // quand le serveur envoie un message de fin de partie
  socket.on('endGame', () => {
    isGameStarted = false;
    $('h1').text('Partie terminé');
  });

  // quand le serveur envoie un message de slider
  socket.on('slider', (info) => {
    if (info.playerID === socket.id) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      player.x = info.x;
      dessinerJoueur();
    }
  });

  let intervalId = null;

  // quand le joueur appuie sur les touches q ou d
  document.addEventListener('keydown', function (event) {
    const step = 5; // Adjust the step size as needed
    if ((event.key === 'q' || event.key === 'd') && !player.collision || !isGameStarted) {
      if (intervalId === null) {
        intervalId = setInterval(() => {
          if (event.key === 'q') {
            slider.value = Math.max(0, parseInt(slider.value) - step);
            socket.emit('sliderServ', { value: slider.value, id: socket.id });
          } else if (event.key === 'd') {
            slider.value = Math.min(320, parseInt(slider.value) + step);
            socket.emit('sliderServ', { value: slider.value, id: socket.id });
          }
        }, 10); // Adjust the interval time as needed
      }
    }
  });

  // quand le joueur relâche les touches q ou d
  document.addEventListener('keyup', function (event) {
    if (event.key === 'q' || event.key === 'd') {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  // Handle reconnection during an ongoing game
  socket.on('gameState', (state) => {
    if (state.isGameStarted) {
      isGameStarted = true;
      slider.disabled = true;
      $('h1').text('Partie en cours - Attendez la prochaine partie');

      // Initialiser les variables laves du client avec l'état actuel
      if (state.laveState && state.laveState.length > 0) {
        Lave = state.laveState;
        LaveHauteur = state.LaveHauteur;
        LaveEcart = state.LaveEcart;

        // Redessiner les laves existantes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < Lave.length; i++) {
          ctx.drawImage(laveImage, 0, 0, 500, 500, 0, Lave[i].y, Lave[i].x, LaveHauteur);
          ctx.drawImage(laveImage, 0, 0, 500, 500, Lave[i].x + LaveEcart, Lave[i].y, canvas.width - Lave[i].x - LaveEcart, LaveHauteur);
        }
      }
    } else {
      isGameStarted = false;
      slider.disabled = false;
      $('h1').text('En attente de l\'hôte');
    }
  });

  // Request the current game state on reconnect
  socket.emit('requestGameState');
});