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
const rooms = {};

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

function startTimer(roomID) {
    const room = rooms[roomID];
    if (!room || room.isTimerRunning) return;
    
    room.isTimerRunning = true;
    room.timeLeft = 15;
    io.to(roomID).emit('updateTimer', room.timeLeft);

    room.timer = setInterval(() => {
        room.timeLeft -= 1;
        io.to(roomID).emit('updateTimer', room.timeLeft);

        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            revealAnswer(roomID);
            setTimeout(() => nextQuestion(roomID), 2000);
        }
    }, 1000);
}

function resetTimer(roomID) {
    const room = rooms[roomID];
    if (!room) return;
    
    clearInterval(room.timer);
    room.timeLeft = 15;
    io.to(roomID).emit('updateTimer', room.timeLeft);
}

function resetQuestion(roomID) {
    io.to(roomID).emit('newQuestion', { question: "En attente de joueurs...", answers: [] });
}

function nextQuestion(roomID) {
    const room = rooms[roomID];
    if (!room) return;

    room.currentQuestionIndex = (room.currentQuestionIndex + 1) % questions.length;
    room.responses = {};
    io.to(roomID).emit('newQuestion', questions[room.currentQuestionIndex]);
    io.to(roomID).emit('updateResponseCount', 0);
    room.isTimerRunning = false;
    startTimer(roomID);
}

function revealAnswer(roomID) {
    const room = rooms[roomID];
    if (!room) return;

    clearInterval(room.timer);
    const correctIndex = questions[room.currentQuestionIndex].correctIndex;
    io.to(roomID).emit('revealAnswer', correctIndex);
}

io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    socket.on('createRoom', () => {
        const roomID = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        if (!rooms[roomID]) {
            rooms[roomID] = { 
                players: [],
                host: socket.id,
                screen: null,
                currentQuestionIndex: 0,
                responses: {},
                timer: null,
                timeLeft: 15,
                isTimerRunning: false,
                isGameStarted: false
            };
            console.log(`Salle ${roomID} créée par ${socket.id}`);
        }
        socket.join(roomID);
        socket.roomID = roomID;
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
            socket.roomID = idRoom;
            socket.playerName = name;
            
            if (name === 'Ecran') {
                rooms[idRoom].screen = socket.id;
                console.log(`Écran rejoint la salle ${idRoom}`);
                socket.emit('updatePlayerList', rooms[idRoom].players.map(p => p.name));
            } else {
                const existingPlayerIndex = rooms[idRoom].players.findIndex(p => p.name === name);
                if (existingPlayerIndex === -1) {
                    rooms[idRoom].players.push({ id: socket.id, name: name });
                } else {
                    rooms[idRoom].players[existingPlayerIndex].id = socket.id;
                }
                
                io.to(idRoom).emit('updatePlayerCount', rooms[idRoom].players.length);
                io.to(idRoom).emit('updatePlayerList', rooms[idRoom].players.map(p => p.name));

                const room = rooms[idRoom];
                if (room.isGameStarted) {
                    socket.emit('newQuestion', questions[room.currentQuestionIndex]);
                    socket.emit('updateTimer', room.timeLeft);
                } else {
                    socket.emit('waitingForHost', 'En attente de l\'hôte...');
                }

                console.log(`Joueur ${name} rejoint la salle ${idRoom}`);
            }
        } else {
            console.log(`Salle ${idRoom} non trouvée ou ${name} non défini`);
            socket.emit('noRoom');
        }
    });

    socket.on('response', (answerIndex) => {
        if (socket.roomID && rooms[socket.roomID]) {
            const room = rooms[socket.roomID];
            room.responses[socket.id] = answerIndex;
            io.to(socket.roomID).emit('updateResponseCount', Object.keys(room.responses).length);

            if (Object.keys(room.responses).length === room.players.length) {
                clearInterval(room.timer);
                io.to(socket.roomID).emit('updateTimer', 0);
                revealAnswer(socket.roomID);
                setTimeout(() => nextQuestion(socket.roomID), 3000);
            }
        }
    });

    socket.on('startGame', () => {
        if (socket.roomID && rooms[socket.roomID]) {
            const room = rooms[socket.roomID];
            if (!room.isGameStarted && room.players.length > 0) {
                io.to(socket.roomID).emit('waitingForHost', '');
                room.isGameStarted = true;
                nextQuestion(socket.roomID);
            }
        }
    });

    socket.on('stopGame', () => {
        if (socket.roomID && rooms[socket.roomID]) {
            const room = rooms[socket.roomID];
            io.to(socket.roomID).emit('waitingForHost', 'En attente de l\'hôte...');
            room.isTimerRunning = false;
            resetTimer(socket.roomID);
            resetQuestion(socket.roomID);
            room.isGameStarted = false;
        }
    });

    socket.on('disconnection', (playerName) => {
        if (socket.roomID && rooms[socket.roomID]) {
            const room = rooms[socket.roomID];
            const playerIndex = room.players.findIndex(p => p.name === playerName);
            
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                
                io.to(socket.roomID).emit('updatePlayerCount', room.players.length);
                io.to(socket.roomID).emit('updatePlayerList', room.players.map(p => p.name));
                
                if (room.host === socket.id) {
                    if (room.players.length > 0) {
                        room.host = room.players[0].id;
                    } else {
                        delete rooms[socket.roomID];
                        console.log(`Salle ${socket.roomID} supprimée car vide`);
                    }
                }
                
                if (room.players.length < 2) {
                    io.to(socket.roomID).emit('waitingForHost', 'Pas assez de joueurs pour continuer la partie');
                    room.isTimerRunning = false;
                    resetTimer(socket.roomID);
                    resetQuestion(socket.roomID);
                    room.isGameStarted = false;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Déconnexion: ${socket.id}`);
        
        if (socket.roomID && rooms[socket.roomID]) {
            const room = rooms[socket.roomID];
            
            if (room.screen === socket.id) {
                room.screen = null;
                console.log(`Écran déconnecté de la salle ${socket.roomID}`);
                io.to(socket.roomID).emit('screenDisconnected');
                room.isTimerRunning = false;
                resetTimer(socket.roomID);
                resetQuestion(socket.roomID);
                room.isGameStarted = false;
            } else {
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    
                    io.to(socket.roomID).emit('updatePlayerCount', room.players.length);
                    io.to(socket.roomID).emit('updatePlayerList', room.players.map(p => p.name));
                    
                    if (room.host === socket.id) {
                        if (room.players.length > 0) {
                            room.host = room.players[0].id;
                        } else {
                            delete rooms[socket.roomID];
                            console.log(`Salle ${socket.roomID} supprimée car vide`);
                        }
                    }
                    
                    if (room.players.length < 2) {
                        io.to(socket.roomID).emit('waitingForHost', 'Pas assez de joueurs pour continuer la partie');
                        room.isTimerRunning = false;
                        resetTimer(socket.roomID);
                        resetQuestion(socket.roomID);
                        room.isGameStarted = false;
                    }
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running");
});
