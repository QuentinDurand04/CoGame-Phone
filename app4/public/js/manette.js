$(function () {
    const socket = io();
    let selectedButtonIndex = null;

    socket.emit('identify', 'manette');

    socket.on('waitingForHost', (text) => {
      $('#players').text(text);
    });

    socket.on('newQuestion', (data) => {
      $('#buttons').empty();
      selectedButtonIndex = null;

      data.answers.forEach((answer, index) => {
        const button = $('<button>')
                .text(answer)
                .attr('id', 'btn' + index)
                .click(() => {
                 
                  socket.emit('response', index);
                  selectedButtonIndex = index;
                  $('button').prop('disabled', true);
                  $('#disconnect').removeAttr('disabled');
                });
        $('#buttons').append(button);
      });
    });

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



    $('#disconnect').click(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const name = urlParams.get('name');
      socket.emit('disconnection', name); 
      setTimeout(() => {
        window.location.href = "/BasQiZ/choix";
      });
    });


  });
  