let joueurs = [];

$(function () {
    const socket = io();
    const $room = $('#room');
    const $question = $('#question');
    const $answers = $('#answers');
    const $timer = $('#timer');
    const $playerCount = $('#playerCount');
    const $responseCount = $('#responseCount');
    const $joueurs = $('#joueurs');
    const $file = $('#file');

    const urlParams = new URLSearchParams(window.location.search);
    const idRoom = urlParams.get('idRoom');

    if (idRoom) {
        socket.emit('existRoom', { idRoom });
        socket.on('yesRoom', () => {
            socket.emit('joinRoom', { name: 'Ecran', idRoom });
            $room.text(`ID de la salle : ${idRoom}`);
        });
        socket.on('noRoom', () => {
            socket.emit('createRoom');
        });
    } else {
        socket.emit('createRoom');
    }

    socket.on('idRoom', (room) => {
        $room.text(`ID de la salle : ${room}`);
        socket.emit('joinRoom', { name: 'Ecran', idRoom: room });
    });

    socket.on('newQuestion', (data) => {
        $question.text(data.question);
        $answers.empty();
        data.answers.forEach(answer => {
            $answers.append(`<div>${answer}</div>`);
        });
        $timer.text(15);
    });

    socket.on('updatePlayerCount', (count) => {
        $playerCount.text(`Nombres de joueurs dans la partie : ${count}`);
        
        if (count > 1) {
            $question.text('La partie va commencer dans 3 secondes...');
            setTimeout(() => socket.emit('startGame'), 3000);
        }
        
        if (count < 2) {
            socket.emit('stopGame');
        }
    });

    socket.on('updatePlayerList', (playerList) => {
        joueurs = playerList;
        $joueurs.html(`Nom des joueurs dans la partie :<br>${joueurs.join('<br>')}`);
    });
    
    socket.on('updateResponseCount', (count) => {
        $responseCount.text(`Réponses reçues : ${count}`);
    });

    socket.on('updateTimer', (timeLeft) => {
        $timer.text(timeLeft);
        $file.val(timeLeft);

        if (timeLeft === 0) {
            $timer.text("0");
            $file.val(0);
        }
    });

    socket.on('revealAnswer', (correctIndex) => {
        $answers.find('div').eq(correctIndex).css('background-color', 'green');
    });

    socket.on("delete", () => {
        window.location.href = '/BasQiZ/choix';
    });

    $('#retour').on('click', () => {
        window.location.href = '/BasQiZ/choix';
    });
});