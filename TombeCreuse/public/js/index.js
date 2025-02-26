document.getElementById("admin").addEventListener("click", () => {
    if(document.getElementById("mdp").value === "admin"){
        window.location.href = `/admin`;
    }
});

document.getElementById("ecran").addEventListener("click", () => {
    window.location.href = `/ecran`;
});

document.getElementById("manette").addEventListener("click", () => {
    window.location.href = `/manette`;
});