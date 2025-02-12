let joueurs = [];

        $(function () {
            const socket = io();
            socket.emit('identify', 'ecran');

            socket.on('idRoom', (room) => {
                console.log("idRoom affiché ?");
                $('#room').text('ID de la salle : ' + room);
            });

            socket.on('newQuestion', (data) => {
                $('#question').text(data.question);
                $('#answers').empty();
                data.answers.forEach((answer, index) => {
                    $('#answers').append('<div> ' + answer + '</div>');
                });
                $('#timer').text(15);
            });

            socket.on('updatePlayerCount', (count, nom) => {
                $('#playerCount').text('Nombres de joueurs dans la partie : ' + count);
                if(count > 1){
                    $('#question').text('La partie va commencer dans 3 secondes...');
                    setTimeout(() => {
                        socket.emit('startGame');
                    }, 3000);
                }
                if(count < 2){
                    socket.emit('stopGame');
                }
                if (!joueurs.includes(nom)) {
                    joueurs.push(nom);
                } else {
                    const index = joueurs.indexOf(nom);
                    if (index !== -1) {
                        joueurs.splice(index, 1); 
                    }
                }

                $('#joueurs').html('Nom des joueurs dans la partie :<br>' + joueurs.join('<br>'));
            });
            
            socket.on('updateResponseCount', (count) => {
                $('#responseCount').text('Réponses reçues : ' + count);
            });

            socket.on('updateTimer', (timeLeft) => {
                $('#timer').text(timeLeft);
                $('#file').val(timeLeft);

                if (timeLeft === 0) {
                    $('#timer').text("0");
                    $('#file').val(0);
                }
            });


            socket.on('revealAnswer', (correctIndex) => {
                $('#answers div').eq(correctIndex).css('background-color', 'green');
            });

            socket.on("delete", () => {
                window.location.href = `/BasQiZ/choix`;
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
                window.location.href = `/BasQiZ/choix`;
            });
        });