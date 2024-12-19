$(function () {
    const socket = io();
    let selectedButtonIndex = null; // Variable pour stocker l'index du bouton cliqué

    socket.emit('identify', 'manette');

    socket.on('waitingForHost', (text) => {
      $('#buttons').text(text);
    });

    // Afficher les réponses pour chaque nouvelle question
    socket.on('newQuestion', (data) => {
      $('#buttons').empty();
      selectedButtonIndex = null; // Réinitialiser le bouton sélectionné

      data.answers.forEach((answer, index) => {
        const button = $('<button>')
                .text(answer)
                .attr('id', 'btn' + index)
                .click(() => {
                  // Envoyer la réponse sélectionnée au serveur avec l'index
                  socket.emit('response', index);
                  selectedButtonIndex = index; // Mémoriser le bouton cliqué
                  $('button').prop('disabled', true); // Désactiver tous les boutons après un clic
                  $('#disconnect').removeAttr('disabled');
                });
        $('#buttons').append(button);
      });
    });

    // Afficher le retour visuel selon la réponse correcte ou incorrecte
    socket.on('revealAnswer', (correctIndex) => {
      let score = parseInt($('#score').text());
      $('#buttons button').each(function (index) {
        if (index === selectedButtonIndex) {
          if (index === correctIndex) {
            $(this).css('background-color', 'green'); 
            score++; 
          } else {
            $(this).css('background-color', 'red'); 
            score--;
          }
        } else if (index === correctIndex) {
          $(this).css('background-color', 'green');
        }
      });
      $('#score').text(`${score} point${score !== 1 ? 's' : ''}`);
    });



    // Bouton de déconnexion
    $('#disconnect').click(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const name = urlParams.get('name');
      socket.emit('disconnection', name); 
      // Redirection après déconnexion
      setTimeout(() => {
        window.location.href = "/choix";
      });
    });


  });