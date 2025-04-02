$(document).ready(function() {
    const socket = io();
    let roomID = new URLSearchParams(window.location.search).get('idRoom');
    let playerName = new URLSearchParams(window.location.search).get('name');
    let isScreenConnected = true;
    let score = parseInt(localStorage.getItem(`score_${roomID}_${playerName}`)) || 0;
    let selectedAnswerIndex = null;
    let isQuestionActive = false;

    function updateScore() {
        $('#score').text(`${score} point${score > 1 ? 's' : ''}`);
    }

    function showScreenDisconnectedMessage() {
        $('.manette-container').html(`
            <div class="question-container">
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
        
        $('.question').text(question.question);
        $('#buttons').empty();
        
        question.answers.forEach((answer, index) => {
            const button = $('<button>')
                .addClass('answer-button')
                .text(answer)
                .on('click', () => submitAnswer(index));
            $('#buttons').append(button);
        });
        
        updateScore();
    });

    socket.on('updateTimer', (timeLeft) => {
        if (!isScreenConnected) return;
        $('.timer').text(timeLeft);

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
        
        $('.answer-button').prop('disabled', true);
        $('.answer-button').eq(correctIndex).addClass('correct');
        if (selectedAnswerIndex !== null && selectedAnswerIndex !== correctIndex) {
            $('.answer-button').eq(selectedAnswerIndex).addClass('incorrect');
        }
        
        updateScore();
    });

    socket.on('waitingForHost', (message) => {
        if (!isScreenConnected) return;
        isQuestionActive = false;
        $('.question').text(message);
        $('#buttons').empty();
        updateScore();
    });

    window.submitAnswer = function(answerIndex) {
        if (!isScreenConnected || !isQuestionActive) return;
        selectedAnswerIndex = answerIndex;
        socket.emit('response', answerIndex);
        $('.answer-button').prop('disabled', true);
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
  