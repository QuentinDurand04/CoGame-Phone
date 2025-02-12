document.addEventListener("DOMContentLoaded", function() {
    const character = document.getElementById('character');
    const grid = document.getElementById('grid');
    const gridSize = 4;
    const cellSize = grid.clientWidth / gridSize;
    const targetColorElement = document.getElementById('target-color');
    const timerElement = document.getElementById('timer');
    let timer = 10;
    let interval;
    let targetColor;
    let targetCellIndex;
    let blackCellIndex = -1;

    // Ensure characterPosition is defined
    const characterPosition = { x: 0, y: 0 };

    // Define the four colors
    const colors = ['red', 'green', 'blue', 'yellow'];

    // Function to get a random color from the defined colors
    function getRandomColor() {
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Create the grid cells
    function createGrid() {
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.style.backgroundColor = getRandomColor(); // Assign a random color to each cell
            grid.appendChild(cell);
        }
    }

    // Set a new target color and cell
    function setNewTarget() {
        targetColor = getRandomColor();
        targetColorElement.style.backgroundColor = targetColor;
        targetCellIndex = Math.floor(Math.random() * gridSize * gridSize);
        document.querySelector(`.cell[data-index="${targetCellIndex}"]`).style.backgroundColor = targetColor;
    }

    // Start the timer
    function startTimer() {
        timer = 10; // Change the timer to 10 seconds
        timerElement.textContent = `Time: ${timer}s`;
        interval = setInterval(() => {
            timer--;
            timerElement.textContent = `Time: ${timer}s`;
            if (timer <= 0) {
                clearInterval(interval);
                checkWinCondition();
            }
        }, 1000);
    }

    // Check if the player is on the target cell when the timer ends
    function checkWinCondition() {
        const characterCellIndex = Math.floor(characterPosition.y / cellSize) * gridSize + Math.floor(characterPosition.x / cellSize);
        const charCellColor = document.querySelector(`.cell[data-index="${characterCellIndex}"]`).style.backgroundColor;
        if (charCellColor === targetColor) {
            do {
                blackCellIndex = Math.floor(Math.random() * gridSize * gridSize);
            } while (blackCellIndex === characterCellIndex);
            document.querySelector(`.cell[data-index="${blackCellIndex}"]`).style.backgroundColor = 'black';
            setNewTarget();
            startTimer();
        } else {
            alert('Game Over! Time is up.');
            resetGame();
        }
    }

    // Reset the game
    function resetGame() {
        characterPosition.x = 0;
        characterPosition.y = 0;
        character.style.left = '0px';
        character.style.top = '0px';
        if (blackCellIndex !== -1) {
            document.querySelector(`.cell[data-index="${blackCellIndex}"]`).style.backgroundColor = getRandomColor();
        }
        setNewTarget();
        startTimer();
    }

    // Initialize the joystick
    const joy = new JoyStick('joyDiv', {}, function (stickData) {
        const maxDistance = 50; // Adjust this value as needed
        const speed = 2; // Adjust this value as needed

        let deltaX = stickData.x / maxDistance * speed;
        let deltaY = -(stickData.y / maxDistance) * speed;

        let newX = characterPosition.x + deltaX;
        let newY = characterPosition.y + deltaY;

        // Ensure the character stays within the grid boundaries
        newX = Math.max(0, Math.min(newX, grid.clientWidth - character.clientWidth));
        newY = Math.max(0, Math.min(newY, grid.clientHeight - character.clientHeight));

        characterPosition.x = newX;
        characterPosition.y = newY;

        character.style.left = `${newX}px`;
        character.style.top = `${newY}px`;

        // Get the current cell color
        getCurrentCellColor();
    });

    function getCurrentCellColor() {
        const characterCellIndex = Math.floor(characterPosition.y / cellSize) * gridSize + Math.floor(characterPosition.x / cellSize);
        const characterCell = document.querySelector(`.cell[data-index="${characterCellIndex}"]`);

        if (characterCell) {
            if (characterCellIndex === blackCellIndex) {
                clearInterval(interval);
                alert('Game Over! You hit the black cell.');
                resetGame();
            }
        }
    }

    // Create the grid and start the game
    createGrid();
    setNewTarget();
    startTimer();
});