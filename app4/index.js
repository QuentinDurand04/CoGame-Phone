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
let timer;
let timeLeft = 15;
let isTimerRunning = false;
let isGameStarted = false;
let room;

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
app.get('/accueil', (req, res) => res.sendFile(__dirname + '/public/accueil.html'));
app.get('css/style.css', (req, res) => res.sendFile(__dirname + '/public/css/style.css'));

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;

    timeLeft = 15; // Durée initiale en secondes
    io.emit('updateTimer', timeLeft); // Envoyer la valeur initiale du timer

    timer = setInterval(() => {
        timeLeft -= 1;
        io.emit('updateTimer', timeLeft); // Mettre à jour le timer sur les clients

        if (timeLeft <= 0) {
            clearInterval(timer);
            revealAnswer();
            setTimeout(nextQuestion, 2000); // Passer à la question suivante après 2 secondes
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer); // Arrête tout décompte en cours
    timeLeft = 15; // Durée initiale en secondes
    io.emit('updateTimer', timeLeft); // Envoie l'état figé du timer à 15 secondes
}

function resetQuestion() {
    io.emit('newQuestion', {question: "En attente de joueurs...", answers: []});
}

function nextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    responses = {}; // Réinitialiser les réponses
    io.emit('newQuestion', questions[currentQuestionIndex]);
    io.emit('updateResponseCount', 0); // Réinitialiser le compteur de réponses
    isTimerRunning = false;
    startTimer(); // Lancer le minuteur pour la nouvelle question
}

function revealAnswer() {
    clearInterval(timer); // Arrêter le minuteur si la réponse est révélée avant la fin
    const correctIndex = questions[currentQuestionIndex].correctIndex;
    io.emit('revealAnswer', correctIndex);
}

room = Math.floor(Math.random() * 1000);
io.on('connection', (socket) => {
    let isController = true;
    io.emit('idRoom', room);
});


io.on('connection', (socket) => {
    let isController = false;

    socket.on('identify', (type) => {
        if (type === 'manette') {
            socket.join(room);
            isController = true;
            players.add(socket.id);
            io.emit('updatePlayerCount', players.size);
            if (!isGameStarted && players.size < 1) {
                io.emit('waitingForHost'); // Envoie "En attente de l'hôte" à la manette
            } else {
                sendCurrentQuestion();
                //startTimer(); // Envoie la question actuelle si le jeu a démarré
            }
            /*if (!isTimerRunning) {

            }*/
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
                setTimeout(nextQuestion, 3000); // Passer à la question suivante après 4 secondes
            }
        }
    });

    socket.on('startGame', () => {
        if (!isGameStarted && players.size > 0) {
            isGameStarted = true;
            nextQuestion(); // Lancer la première question

        }
    });

    socket.on('stopGame', () => {
        console.log("1");
        io.emit('waitingForHost', 'En attente de l\' hôte...');
        console.log("158");
        isTimerRunning = false;
        resetTimer();
        resetQuestion();
        isGameStarted = false;
    });

    socket.on('disconnect', () => {
        if (isController) {
            players.delete(socket.id);
            delete responses[socket.id];
            io.emit('updatePlayerCount', players.size);
            if (players.size === 0) {
                isTimerRunning = false;
                resetTimer();
                resetQuestion();
                isGameStarted = false;
            }
        }
    });
});


function sendCurrentQuestion() {
    if (isGameStarted) {
        const questionData = questions[currentQuestionIndex];
        responses = {};
        io.emit('newQuestion', {
            question: questionData.question,
            answers: questionData.answers
        });
    }
}


server.listen(8001, () => {
    console.log("Server is running on http://localhost:8001");
});
