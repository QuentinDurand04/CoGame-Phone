
const socket = io();

document.getElementById("retour").addEventListener("click", () => {
    window.location.href = `/`;
});


document.getElementById("createScreenButtonAdmin").addEventListener("click", () => {
    socket.emit("createRoom");
    socket.on("idRoom", (room) => {
        window.location.href = `/BasQiZ/admin?idRoom=${room}`;
    });
});


document.getElementById("createScreenButton").addEventListener("click", () => {
    socket.emit("createRoom");
    socket.on("idRoom", (room) => {
        window.location.href = `/BasQiZ/ecran?idRoom=${room}`;
    });
});

document.getElementById("joinRoomButton").addEventListener("click", () => {
    const idRoom = document.getElementById("idRoom").value;
    if (idRoom) {
        console.log("ID de la salle :", idRoom);
        socket.emit("existRoom", { idRoom });
        socket.on("yesRoom", () => {
            window.location.href = `/BasQiZ/nom?idRoom=${idRoom}`;
        });
        socket.on("noRoom", () => {
            alert("La salle " + idRoom + " n'existe pas.");
        });
    } else {
        alert("Veuillez remplir le champ.");
    }
});