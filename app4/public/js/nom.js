const socket = io();

        document.getElementById("retour").addEventListener("click", () => {
            window.location.href = `/BasQiZ/choix`;
        });

        document.addEventListener("DOMContentLoaded", () => {
            const joinButton = document.getElementById("joinRoomButton");
            if (joinButton) {
                joinButton.addEventListener("click", () => {
                    const name = document.getElementById("name").value.trim();
                    const urlParams = new URLSearchParams(window.location.search);
                    const idRoom = urlParams.get('idRoom');

                    if (idRoom && name) {
                        socket.emit("joinRoom", { idRoom, name });
                        window.location.href = `/BasQiZ/manette?idRoom=${idRoom}&name=${encodeURIComponent(name)}`;
                    } else {
                        alert("Veuillez remplir le champ.");
                    }
                });
            }
        });