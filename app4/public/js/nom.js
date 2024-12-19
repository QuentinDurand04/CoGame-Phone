const socket = io();

        document.getElementById("retour").addEventListener("click", () => {
            window.location.href = `/choix`;
        });

        document.addEventListener("DOMContentLoaded", () => {
            const joinButton = document.getElementById("joinRoomButton");
            if (joinButton) {
                joinButton.addEventListener("click", () => {
                    const name = document.getElementById("name").value.trim();
                    const urlParams = new URLSearchParams(window.location.search);
                    const idRoom = urlParams.get('idRoom');

                    console.log("ID de la salle :", idRoom);
                    console.log("Nom du joueur :", name);
                    console.log("Tentative de rejoindre la salle...");

                    if (idRoom && name) {
                        socket.emit("joinRoom", { idRoom, name });
                        window.location.href = `/manette?idRoom=${idRoom}&name=${encodeURIComponent(name)}`;
                    } else {
                        alert("Veuillez remplir le champ.");
                    }
                });
            }
        });