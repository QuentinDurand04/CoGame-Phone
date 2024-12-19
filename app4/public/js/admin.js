let joueurs = [];  // Tableau pour stocker les noms des joueurs

            $(function () {
            const socket = io();
            socket.emit('identify', 'ecran');

            socket.on('idRoom', (room) => {
                console.log("idRoom affiché ?");
                $('#room').text('ID de la salle : ' + room);
            });

            $('#startGameButton').click(() => {
                socket.emit('startGame'); // Émettre un événement pour démarrer le jeu
            });

            $('#stopGameButton').click(() => {
                socket.emit('stopGame'); // Émettre un événement pour arreter le jeu
            });

            // Afficher la nouvelle question
            socket.on('newQuestion', (data) => {
                $('#question').text(data.question);
                $('#answers').empty();
                data.answers.forEach((answer, index) => {
                    $('#answers').append('<div> ' + answer + '</div>');
                });
                $('#timer').text(15);
            });

            // Mettre à jour le nombre de joueurs et de réponses
            socket.on('updatePlayerCount', (count, nom) => {
                $('#playerCount').text('Nombres de joueurs dans la partie : ' + count);
                if (!joueurs.includes(nom)) {
                    joueurs.push(nom);  // Ajoute le nom s'il n'existe pas encore
                } else {
                    const index = joueurs.indexOf(nom);  // Trouve l'index du nom
                    if (index !== -1) {
                        joueurs.splice(index, 1);  // Supprime l'élément à cet index
                    }
                }
                // Met à jour l'affichage avec tous les noms
                $('#joueurs').html('Nom des joueurs dans la partie :<br>' + joueurs.join('<br>'));
            });
            
            socket.on('updateResponseCount', (count) => {
                $('#responseCount').text('Réponses reçues : ' + count);
            });

            socket.on('updateTimer', (timeLeft) => {
                $('#timer').text(timeLeft);
                $('#file').val(timeLeft);

                // Si le timer est à 0, mettre la barre de progression et le timer à zéro
                if (timeLeft === 0) {
                    $('#timer').text("0");
                    $('#file').val(0);
                }
            });


            // Afficher la bonne réponse
            socket.on('revealAnswer', (correctIndex) => {
                $('#answers div').eq(correctIndex).css('background-color', 'green');
            });

        });

        function room() {
            const urlParams = new URLSearchParams(window.location.search);
            const idRoom = urlParams.get('idRoom');
    
            if (idRoom) {
                document.getElementById('room').textContent = 'ID de la salle : ' + idRoom;
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById("retour").addEventListener("click", () => {
                window.location.href = `/choix`;
            });
        });