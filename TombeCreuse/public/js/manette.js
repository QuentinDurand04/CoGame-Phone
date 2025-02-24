$(function () {
  // création d'une connexion websocket
  const socket = io();
  // envoyer un message pour s'identifier
  socket.emit('identify', 'manette');
  // définition des variables
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let slider = document.getElementById('slider');
  let rand = Math.floor(Math.random() * 256);
  let color = 'rgb(' + rand + ',' + rand + ',' + rand + ')';
  let player = { x: 150, y: 50, width: 20, height: 20, collision: false };
  let Lave = [];
  let LaveHauteur;
  let LaveEcart;

  // envoyer une requête au serveur pour changer la position du joueur si le joueur n'est pas éliminé
  document.getElementById('slider').addEventListener('input', function () {
    if (!player.collision) {
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

  // quand le serveur envoie un message pour dessiner la lave
  socket.on('drawLave', (lave) => {
    // si le joueur n'est pas en collision
    if (!player.collision) {
      // récupérer les informations de la lave
      Lave = lave.tab;
      image = new Image();
      image.src = 'images/lave.jpg';
      // effacer la lave précédente
      ctx.clearRect(0, lave.y + lave.speed, lave.x, lave.LaveHauteur);
      ctx.clearRect(lave.x + lave.LaveEcart, lave.y + lave.speed, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
      // lave d'un côté
      ctx.drawImage(image, 0, 0, 500, 500, 0, lave.y, lave.x, lave.LaveHauteur);
      // lave de l'autre côté
      ctx.drawImage(image, 0, 0, 500, 500, lave.x + lave.LaveEcart, lave.y, canvas.width - lave.x - lave.LaveEcart, lave.LaveHauteur);
      // vérifier la collision avec la nouvelle lave
      checkCollision();
      // si le joueur est en collision afficher un message de fin de partie
      if (player.collision) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px serif';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
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
      dessinerJoueur();
    }
  });

  // quand le serveur envoie un message d'attente
  socket.on('waitingForHost', () => {
    $('h1').text('En attente de l\'hôte');
  });

  // quand le serveur envoie un message de début de partie
  socket.on('startGame', () => {
    slider.disabled = false;
    player.collision = false;
    $('h1').text('Partie en cours');
    // clear le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // dessiner le joueur
    dessinerJoueur();
  });

  // quand le serveur envoie un message de fin de partie
  socket.on('endGame', () => {
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
    if ((event.key === 'q' || event.key === 'd') && !player.collision) {
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

});