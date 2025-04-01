$(function () {
  // création d'une connexion websocket
  const socket = io();
  const pseudoInput = document.getElementById('pseudoInput');
  const pseudoButton = document.getElementById('pseudoButton');
  let pseudo = pseudoInput.value? pseudoInput.value : null;
  // envoyer un message pour s'identifier
  socket.emit('identify', {type: 'manette', pseudo: pseudo});
  pseudo = pseudo? pseudo : 'id';
  //change the placeholder of the input
  pseudoInput.placeholder = 'Pseudo : ' + pseudo;
  //on click change the pseudo
  pseudoButton.addEventListener('click', () => {
    if (!isGameStarted){
      //change the pseudo querie
      pseudo = pseudoInput.value;
      //change the placeholder of the input
      pseudoInput.placeholder = 'Pseudo : ' + pseudo;
      socket.emit('changePseudo', {pseudo: pseudo, id: socket.id});
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

// In manette.js, modify the check collision function
  function checkCollision() {
    // Only perform the check if we have lava data and the game is running
    if (Lave.length > 0 && isGameStarted && !player.collision) {
      // Check collision even when tab is not focused
      if (!(player.x >= Lave[0].x && player.x <= Lave[0].x + LaveEcart - 20) &&
          Lave[0].y <= player.y && player.y <= Lave[0].y + LaveHauteur) {

        // Register collision and notify server
        slider.disabled = true;
        player.collision = true;

        // Send the collision event to the server immediately
        socket.emit('collisionServ', { id: socket.id, collision: true });

        // Update the UI to show game over
        updateGameOverUI(player.score);
        return true;
      }
    }
    return false;
  }
  function updateGameOverUI(finalScore) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px serif';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    ctx.font = '24px serif';
    ctx.fillStyle = 'black';
    ctx.fillText('Score : ' + finalScore, canvas.width / 2, canvas.height / 2 + 50);
  }

  socket.on('changePseudoServ', (info) => {
    if (info.id === socket.id) {
      player.pseudo = info.pseudo;
      pseudoInput.placeholder = 'Pseudo : ' + info.pseudo;
    }
  });
  // quand le serveur envoie un message pour dessiner la lave
  socket.on('drawLave', (lave) => {
    // Store lava data even if not drawing
    Lave = lave.tab;
    LaveHauteur = lave.LaveHauteur;
    LaveEcart = lave.LaveEcart;

    // Check for collisions regardless of UI update
    if (!player.collision && isGameStarted) {
      checkCollision();

      // Only if no collision and tab is focused, update the UI
      if (!player.collision) {
        // Clear previous lava
        ctx.clearRect(0, lave.y + lave.speed, lave.x, lave.LaveHauteur);
        ctx.clearRect(lave.x + lave.LaveEcart, lave.y + lave.speed, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);

        // Draw new lava
        ctx.drawImage(laveImage, 0, 0, 500, 500, 0, lave.y, lave.x, lave.LaveHauteur);
        ctx.drawImage(laveImage, 0, 0, 500, 500, lave.x + lave.LaveEcart, lave.y, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
      }
    }

    // If just collided, update the score
    if (player.collision && player.score === 0) {
      player.score = lave.score;
      updateGameOverUI(player.score);
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
    } else {
      isGameStarted = false;
      slider.disabled = false;
      $('h1').text('En attente de l\'hôte');
    }
  });

  // Request the current game state on reconnect
  socket.emit('requestGameState');

});