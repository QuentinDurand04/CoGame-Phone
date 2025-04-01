$(document).ready(function() {
    const socket = io();
    let roomID = new URLSearchParams(window.location.search).get('idRoom');
    let playerName = new URLSearchParams(window.location.search).get('name');
    let isScreenConnected = true;
    let score = parseInt(localStorage.getItem(`score_${roomID}_${playerName}`)) || 0;
    let selectedAnswerIndex = null;
    let isQuestionActive = false;

    function createDisconnectButton() {
        return $('<button>')
            .addClass('btn btn-danger mt-3')
            .text('Se déconnecter')
            .on('click', function(e) {
                e.preventDefault();
                if (socket.roomID) {
                    socket.emit('disconnection', playerName);
                    window.location.href = '/BasQiZ/choix';
                }
            });
    }

    function displayScore() {
        return $('<div>')
            .addClass('text-center mb-3')
            .html(`<h3>Score: ${score}</h3>`);
    }

    function showScreenDisconnectedMessage() {
        $('.container').html(`
            <div class="text-center">
                <h2 class="text-danger mb-4">L'écran associé à la room s'est déconnecté</h2>
                <p class="mb-4">Veuillez revenir à la page d'accueil pour continuer à jouer</p>
                <button class="btn btn-primary" onclick="window.location.href='/BasQiZ/choix'">Retour à l'accueil</button>
            </div>
        `);
    }

    socket.emit('joinRoom', { name: playerName, idRoom: roomID });

    socket.on('screenDisconnected', () => {
        isScreenConnected = false;
        showScreenDisconnectedMessage();
    });

    socket.on('newQuestion', (question) => {
        if (!isScreenConnected) return;
        selectedAnswerIndex = null;
        isQuestionActive = true;
        
        $('.container').html(`
            <div class="text-center">
                <h2 class="mb-4">${question.question}</h2>
                <div class="row justify-content-center">
                    ${question.answers.map((answer, index) => `
                        <div class="col-md-6 mb-3">
                            <button class="btn btn-primary btn-lg w-100" onclick="submitAnswer(${index})">
                                ${answer}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
        $('.container').append(displayScore());
        $('.container').append(createDisconnectButton());
    });

    socket.on('updateTimer', (timeLeft) => {
        if (!isScreenConnected) return;
        $('#timer').text(timeLeft);

        if (timeLeft <= 0) {
            isQuestionActive = false;
        }
    });

    socket.on('revealAnswer', (correctIndex) => {
        if (!isScreenConnected) return;
        isQuestionActive = false;
        
        if (selectedAnswerIndex === correctIndex) {
            score += 1;
        } else if (selectedAnswerIndex !== null) {
            score -= 1;
        }
        
        localStorage.setItem(`score_${roomID}_${playerName}`, score);
        
        $('.btn').removeClass('btn-primary btn-success btn-danger');
        $('.btn').eq(correctIndex).addClass('btn-success');
        $('.btn').not(':eq(' + correctIndex + ')').addClass('btn-danger');
        
        $('.container').append(displayScore());
    });

    socket.on('waitingForHost', (message) => {
        if (!isScreenConnected) return;
        isQuestionActive = false;
        $('.container').html(`
            <div class="text-center">
                <h2 class="mb-4">${message}</h2>
            </div>
        `);
        $('.container').append(displayScore());
        $('.container').append(createDisconnectButton());
    });

    window.submitAnswer = function(answerIndex) {
        if (!isScreenConnected || !isQuestionActive) return;
        selectedAnswerIndex = answerIndex;
        socket.emit('response', answerIndex);
        $('.btn').prop('disabled', true);
    };

    socket.on('disconnect', () => {
        if (isScreenConnected) {
            showScreenDisconnectedMessage();
        }
    });

    window.onbeforeunload = () => {
        if (socket.roomID) {
            socket.emit('disconnection', playerName);
        }
    };
});
  