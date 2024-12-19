
const socket = io();

document.getElementById("retour").addEventListener("click", () => {
    window.location.href = `/`;  // Redirection avec l'ID généré
});


// Création de l'écran principal admin
document.getElementById("createScreenButtonAdmin").addEventListener("click", () => {
    socket.emit("createRoom");  // Demande de création de room
    socket.on("idRoom", (room) => {
        window.location.href = `/admin?idRoom=${room}`;  // Redirection avec l'ID généré
    });
});

// Création de l'écran principal
document.getElementById("createScreenButton").addEventListener("click", () => {
    socket.emit("createRoom");  // Demande de création de room
    socket.on("idRoom", (room) => {
        window.location.href = `/ecran?idRoom=${room}`;  // Redirection avec l'ID généré
    });
});

// Connexion de la manette
document.getElementById("joinRoomButton").addEventListener("click", () => {
    const idRoom = document.getElementById("idRoom").value;
    if (idRoom) {
        window.location.href = `/nom?idRoom=${idRoom}`;
    } else {
        alert("Veuillez remplir le champ.");
    }
});