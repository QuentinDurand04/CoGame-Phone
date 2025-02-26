const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});
const fs = require('fs');

let questions = [];
let currentQuestionIndex = 0;
let responses = {};
let timer;
let timeLeft = 15;
let isTimerRunning = false;
let isGameStarted = false;
const rooms = {};
let nbJoueur = 0;

fs.readFile('questions.json', 'utf8', (err, data) => {
    if (err) throw err;
    questions = JSON.parse(data);
    questions.sort(() => Math.random() - 0.5);
});

app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/html/index.html'));
app.get('/BasQiZ/choix', (req, res) => res.sendFile(__dirname + '/public/html/choix.html'));
app.get('/BasQiZ/manette', (req, res) => {
    const { idRoom, name } = req.query;
    if (idRoom && name) {
        res.sendFile(__dirname + '/public/html/manette.html');
    } else {
        res.redirect('/BasQiZ/nom');
    }
});
app.get('/BasQiZ/nom', (req, res) => {
    const { idRoom } = req.query;
    if (idRoom) {
        res.sendFile(__dirname + '/public/html/nom.html');
    } else {
        res.redirect('/BasQiZ/choix');
    }
});

app.get('/BasQiZ/admin', (req, res) => {
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

io.on('connection', (socket) => {

    socket.on('createRoom', () => {
        const roomID = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        if (!rooms[roomID]) {
            rooms[roomID] = { players: [] };
            console.log(`Salle ${roomID} créée.`);
        }
        socket.join(roomID);
        
        socket.emit('idRoom', roomID);  
    });

    socket.on('existRoom', ({ idRoom }) => {
    
        if (rooms[idRoom]) {
            socket.emit('yesRoom');
        } else {
            socket.emit('noRoom');
        }
    });


    socket.on('joinRoom', ({ name, idRoom }) => {
        if (rooms[idRoom]) {
            socket.join(idRoom);
            rooms[idRoom].players.push(name);
            nbJoueur = rooms[idRoom].players.length;
            io.emit('updatePlayerCount', nbJoueur, name);
            console.log(`Joueur ${name} rejoint la salle ${idRoom}`);
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
            io.emit('waitingForHost', '');
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

        const roomID = Object.keys(rooms).find(roomID => rooms[roomID].players.includes(name));

        if (roomID) {
            const room = rooms[roomID];
            nbJoueur = room.players.length;;

            room.players = room.players.filter(id => id !== name);
            nbJoueur = room.players.length;
            io.emit('updatePlayerCount', nbJoueur, name);
            console.log(`Joueur ${name} a quitté la salle ${roomID}`);

            if(nbJoueur < 2){
                io.emit('waitingForHost', 'Pas assez de joueurs pour continuer la partie');
                isTimerRunning = false;
                resetTimer();
                resetQuestion();
                isGameStarted = false;
            }

            if (nbJoueur === 0) {
                delete rooms[roomID];
                console.log(`Salle ${roomID} supprimée.`);
                io.emit('delete');
            }
        } else {
            console.log(`Aucune donnée trouvée pour le socket ${name}`);
        }
    });
                
    

    /*socket.on('disconnect', () => { 
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

server.listen(3000, () => {
    console.log("Server is running");
});
