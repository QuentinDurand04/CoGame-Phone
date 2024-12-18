// Importation des modules nécessaires
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,  // Temps avant déconnexion
    pingInterval: 25000, // Intervalle de ping
});
const fs = require('fs');

// Variables globales
let questions = [];
let currentQuestionIndex = 0;
let players = new Set();
let responses = {};
let timer;
let timeLeft = 15;
let isTimerRunning = false;
let isGameStarted = false;
const rooms = {};
let isController = false;

// Charger les questions
fs.readFile('questions.json', 'utf8', (err, data) => {
    if (err) throw err;
    questions = JSON.parse(data);
    questions.sort(() => Math.random() - 0.5);
});

// Servir les fichiers statiques
app.use(express.static('public'));

// Routes principales
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/BasQiZ/choix', (req, res) => res.sendFile(__dirname + '/public/choix.html'));
app.get('/BasQiZ/manette', (req, res) => {
    const { idRoom, name } = req.query;
    if (idRoom && name) {
        res.sendFile(__dirname + '/public/manette.html');
    } else {
        res.redirect('/choix');
    }
});
app.get('/BasQiZ/ecran', (req, res) => {
    const { idRoom } = req.query;
    if (idRoom) {
        res.sendFile(__dirname + '/public/ecran.html');
    } else {
        res.redirect('/BasQiZ/choix');
    }
});
app.get('/accueil', (req, res) => res.sendFile(__dirname + '/public/accueil.html'));

// Gestion du timer
function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;

    timeLeft = 15;
    io.emit('updateTimer', timeLeft);

    timer = setInterval(() => {
        timeLeft -= 1;
        io.emit('updateTimer', timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timer);
            revealAnswer();
            setTimeout(nextQuestion, 2000);
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    timeLeft = 15;
    io.emit('updateTimer', timeLeft);
}

function resetQuestion() {
    io.emit('newQuestion', { question: "En attente de joueurs...", answers: [] });
}

function nextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    responses = {};
    io.emit('newQuestion', questions[currentQuestionIndex]);
    io.emit('updateResponseCount', 0);
    isTimerRunning = false;
    startTimer();
}

function revealAnswer() {
    clearInterval(timer);
    const correctIndex = questions[currentQuestionIndex].correctIndex;
    io.emit('revealAnswer', correctIndex);
}

// Gestion des événements Socket.IO
io.on('connection', (socket) => {
    // Lors de la création de la room
    socket.on('createRoom', () => {
        const roomID = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        rooms[roomID] = { players: [], host: socket.id };
        socket.join(roomID);
        
        // Envoyer l'ID à choix.html
        socket.emit('idRoom', roomID);  

        console.log(`Salle créée avec l'ID ${roomID}`);
    });


    // Lorsqu'un joueur rejoint une room
    socket.on('joinRoom', ({ name, idRoomJ }) => {
        // Vérifie si la salle existe
        if (rooms[idRoomJ]) {

        // Vérifie si le joueur est déjà dans la salle
        if (!rooms[idRoomJ].players.includes(socket.id)) {

            // Rejoint la salle et ajoute le joueur
            socket.join(idRoomJ);
            rooms[idRoomJ].players.push(socket.id);

            // Mettez à jour le nombre de joueurs
            io.to(idRoomJ).emit('updatePlayerCount', rooms[idRoomJ].players.length);

            console.log(`Joueur ${socket.id} rejoint la salle ${idRoomJ}`);
            console.log(`Nombre de joueurs : ${rooms[idRoomJ].players.length}`);
        } else {
            console.log(`Joueur ${name} est déjà dans la salle ${idRoomJ}`);
        }
        } else {
        // Signale que la salle est introuvable
        socket.emit('error', 'Salle non trouvée');
        console.log(`Tentative de connexion à une salle inexistante : ${idRoomJ}`);
        }
    });



    socket.on('response', (answerIndex) => {
        if (isController && !responses[socket.id]) {
            responses[socket.id] = answerIndex;
            io.emit('updateResponseCount', Object.keys(responses).length);

            if (Object.keys(responses).length === players.size) {
                clearInterval(timer);
                io.emit('updateTimer', 0);
                revealAnswer();
                setTimeout(nextQuestion, 3000);
            }
        }
    });

    socket.on('startGame', () => {
        if (!isGameStarted && players.size > 0) {
            isGameStarted = true;
            nextQuestion();
        }
    });

    socket.on('stopGame', () => {
        io.emit('waitingForHost', 'En attente de l\'hôte...');
        isTimerRunning = false;
        resetTimer();
        resetQuestion();
        isGameStarted = false;
    });

    /*socket.on('disconnect', () => {
        console.log(`Joueur ${socket.id} déconnecté de la salle`);
        for (const roomID in rooms) {
            const room = rooms[roomID];
            
            if (room.players.includes(socket.id)) {
                // Supprimer le joueur de la salle
                room.players = room.players.filter(id => id !== socket.id);
                players.delete(socket.id); 
    
                // Mettre à jour le compteur de joueurs
                io.to(roomID).emit('updatePlayerCount', room.players.length);
                console.log(`Joueur ${socket.id} déconnecté de la salle ${roomID}`);
                
                // Supprimer la salle si plus personne
                if (room.players.length === 0 && room.host === socket.id) {
                    delete rooms[roomID];
                    console.log(`Salle ${roomID} supprimée.`);
                }
            }
        }
    });*/

    socket.on('disconnect', (reason) => {
        console.log(`Déconnexion de ${socket.id}, raison : ${reason}`);
    });
    
    
});

// Démarrage du serveur
server.listen(8001, () => {
    console.log("Server is running on http://localhost:8001");
});
