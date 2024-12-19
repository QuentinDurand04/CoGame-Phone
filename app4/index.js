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
let nbJoueur = 0;

// Charger les questions
fs.readFile('questions.json', 'utf8', (err, data) => {
    if (err) throw err;
    questions = JSON.parse(data);
    questions.sort(() => Math.random() - 0.5);
});

// Servir les fichiers statiques
app.use(express.static('public'));

// Routes principales
app.get('/', (req, res) => res.sendFile(__dirname + '/public/html/index.html'));
app.get('/choix', (req, res) => res.sendFile(__dirname + '/public/html/choix.html'));
app.get('/manette', (req, res) => {
    const { idRoom, name } = req.query;
    if (idRoom && name) {
        res.sendFile(__dirname + '/public/html/manette.html');
    } else {
        res.redirect('/nom');
    }
});
app.get('/nom', (req, res) => {
    const { idRoom } = req.query;
    if (idRoom) {
        res.sendFile(__dirname + '/public/html/nom.html');
    } else {
        res.redirect('/choix');
    }
});

app.get('/admin', (req, res) => {
    const { idRoom } = req.query;
    if (idRoom) {
        res.sendFile(__dirname + '/public/html/admin.html');
    } else {
        res.redirect('/BasQiZ/choix');
    }
});
app.get('/BasQiZ/ecran', (req, res) => {
    const { idRoom } = req.query;
    if (idRoom) {
        res.sendFile(__dirname + '/public/html/ecran.html');
    } else {
        res.redirect('/BasQiZ/choix');
    }
});

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
    socket.on('joinRoom', ({ name, idRoom }) => {
        // Vérifie si la salle existe
        if (rooms[idRoom]) {
            nbJoueur++;
            socket.join(idRoom);
            // Mettez à jour le nombre de joueurs
            io.emit('updatePlayerCount', nbJoueur, name);
            console.log(`Joueur ${socket.id} rejoint la salle ${idRoom}`);
            console.log(`Nombre de joueurs : ${nbJoueur}`);
        } else {
            console.log(`Salle ${idRoom} non trouvée ou ${name} non défini`);
        }
    });



    socket.on('response', (answerIndex) => {
            responses[socket.id] = answerIndex;
            io.emit('updateResponseCount', Object.keys(responses).length);

            if (Object.keys(responses).length === nbJoueur) {
                clearInterval(timer);
                io.emit('updateTimer', 0);
                revealAnswer();
                setTimeout(nextQuestion, 3000);
            }
    });

    socket.on('startGame', () => {
        if (!isGameStarted && nbJoueur > 0) {
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

    socket.on('disconnection', (name) => {
        console.log(`Déconnexion de ${name}`);
        nbJoueur--;
        for (const roomID in rooms) {
            const room = rooms[roomID];
            
            io.emit('updatePlayerCount', nbJoueur, name);
            console.log(`Nombre de joueurs dans la salle ${roomID}: ${nbJoueur}`);

            if(nbJoueur == 0){
                isTimerRunning = false;
                resetTimer();
                resetQuestion();
                isGameStarted = false;
            }
    /*
        // Parcourir toutes les salles
        for (const roomID in rooms) {
            const room = rooms[roomID];
    
            // Vérifier si le joueur est dans la salle
            if (room.players.includes(socket.id)) {
                // Supprimer le joueur de la liste
                room.players = room.players.filter(id => id !== socket.id);
    
                // Mettre à jour le compteur de joueurs
                io.emit('updatePlayerCount', nbJoueur);
                console.log(`Nombre de joueurs dans la salle ${roomID}: ${room.players.length}`);
    
                // Supprimer la salle si elle est vide et que l'hôte s'est déconnecté
                if (room.players.length === 0 && room.host === socket.id) {
                    delete rooms[roomID];
                    console.log(`Salle ${roomID} supprimée.`);
                }
                break;  // Arrêter la boucle après avoir trouvé le joueur
            }
        }*/
    }
    });
    

    /*socket.on('disconnection', () => { 
        console.log(`Joueur ${socket.id} déconnecté de la salle`);
        // Parcourir toutes les salles
        for (const roomID in rooms) {
            const room = rooms[roomID];
            // Vérifier si le joueur est dans la salle
            if (room.players.includes(socket.id)) {
                // Supprimer le joueur de la liste
                room.players = room.players.filter(id => id !== socket.id);
    
                // Mettre à jour le compteur de joueurs
                io.to(roomID).emit('updatePlayerCount', room.players.length);
                console.log(`Nombre de joueurs dans la salle ${roomID}: ${room.players.length}`);
    
                // Supprimer la salle si elle est vide et que l'hôte s'est déconnecté
                if (room.players.length === 0 && room.host === socket.id) {
                    delete rooms[roomID];
                    console.log(`Salle ${roomID} supprimée.`);
                }
                break;  // Arrêter la boucle après avoir trouvé le joueur
            }
        }
    });*/
    
    
    
});

// Démarrage du serveur
server.listen(8001, () => {
    console.log("Server is running on http://localhost:8001");
});
