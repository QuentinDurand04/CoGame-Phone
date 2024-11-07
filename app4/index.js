const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const fs = require('fs');

let questions = [];
let currentQuestionIndex = 0;
let players = new Set();
let responses = {};

// Charger les questions depuis le fichier JSON
fs.readFile('questions.json', 'utf8', (err, data) => {
    if (err) throw err;
    questions = JSON.parse(data);
});

// Route pour servir les fichiers statiques
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/choix', (req, res) => res.sendFile(__dirname + '/public/choix.html'));
app.get('/manette', (req, res) => res.sendFile(__dirname + '/public/manette.html'));
app.get('/ecran', (req, res) => res.sendFile(__dirname + '/public/ecran.html'));


let timer;
let timeLeft = 15;

function startTimer() {
    timeLeft = 15; // Durée initiale en secondes
    io.emit('updateTimer', timeLeft); // Envoyer la valeur initiale du timer

    timer = setInterval(() => {
        timeLeft -= 1;
        io.emit('updateTimer', timeLeft); // Mettre à jour le timer sur les clients

        if (timeLeft <= 0) {
            clearInterval(timer);
            revealAnswer();
            setTimeout(nextQuestion, 4000); // Passer à la question suivante après 4 secondes
        }
    }, 1000);
}

function nextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    responses = {}; // Réinitialiser les réponses
    io.emit('newQuestion', questions[currentQuestionIndex]);
    io.emit('updateResponseCount', 0); // Réinitialiser le compteur de réponses
    startTimer(); // Lancer le minuteur pour la nouvelle question
}

function revealAnswer() {
    clearInterval(timer); // Arrêter le minuteur si la réponse est révélée avant la fin
    const correctIndex = questions[currentQuestionIndex].correctIndex;
    io.emit('revealAnswer', correctIndex);
}

io.on('connection', (socket) => {
    let isController = false;

    socket.on('identify', (type) => {
        if (type === 'manette') {
            isController = true;
            players.add(socket.id);
            io.emit('updatePlayerCount', players.size);
            sendCurrentQuestion();
        }
    });

    socket.on('response', (answerIndex) => {
        if (isController && !responses[socket.id]) {
            responses[socket.id] = answerIndex;
            io.emit('updateResponseCount', Object.keys(responses).length);

            // Vérifier si tous les joueurs ont répondu
            if (Object.keys(responses).length === players.size) {
                clearInterval(timer); // Arrêter le timer
                io.emit('updateTimer', 0); // Mettre le timer et la barre de progression à 0
                revealAnswer();
                setTimeout(nextQuestion, 4000); // Passer à la question suivante après 4 secondes
            }
        }
    });

    socket.on('disconnect', () => {
        if (isController) {
            players.delete(socket.id);
            delete responses[socket.id];
            io.emit('updatePlayerCount', players.size);
        }
    });
});


function sendCurrentQuestion() {
    const questionData = questions[currentQuestionIndex];
    responses = {}; // Réinitialiser les réponses pour la nouvelle question
    io.emit('newQuestion', {
        question: questionData.question,
        answers: questionData.answers
    });
}


server.listen(8001, () => {
    console.log("Server is running on http://localhost:8001");
});
