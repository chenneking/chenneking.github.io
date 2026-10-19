// State is a max_guesses x 8 matrix. Each row represents a step in the game. The first 4 values of the step are the user choice, the last 4 values are the feedback.
// Color indices start with 0. Feedback values are: 2 = right color, right location; 1 = right color; 0 = nothing.
let state = [];
let secretCode = [];
let maxGuesses;
let currentRow;
let solverFn;
let selectedColorCount;
let allowDuplicates;
let gameOver = false;
let endGameTimers = [];

let colorMap = {
    0: '#ff0000',
    1: '#00ff00',
    2: '#0000ff',
    3: '#ffff00',
    4: '#ff00ff',
    5: '#00ffff',
    6: '#ff8800',
    7: '#8800ff'
}

const gameSetup = document.getElementById('game-setup');
const colorPicker = document.getElementById('color-picker');
const gameBoard = document.getElementById('game-board');
const startGameBtn = document.getElementById('start-game-btn');
const restartGameBtnSameSettings = document.getElementById('btn-restart-same');
const restartGameBtnDifferentSettings = document.getElementById('btn-new-settings');


function filterColors() {
    const allPickers = document.querySelectorAll(".color-picker");
    allPickers.forEach((picker, index) => {
        picker.style.display = index < selectedColorCount ? "block" : "none";
        picker.dataset.color = index;
    });
}

function createSecretRow() {
    const row = document.createElement('div');
    row.className = 'game-row secret-row';
    row.innerHTML = `
							<div class="d-flex justify-content-between align-items-center">
									<div class="d-flex">
											<div class="game-peg text-center solution-dummy-peg">❓</div>
											<div class="game-peg text-center solution-dummy-peg">❓</div>
											<div class="game-peg text-center solution-dummy-peg">❓</div>
											<div class="game-peg text-center solution-dummy-peg">❓</div>
									</div>
									<div class="status-message">Continue guessing!</div>
							</div>
					`;
    return row;
}

function generateSecretCode() {
    const colors = Array.from({ length: selectedColorCount }, (_, index) => index);
    secretCode = [];
    for (let i = 0; i < codeLength; i++) {
        const index = Math.floor(Math.random() * colors.length);
        secretCode.push(colors[index]);
        if (!allowDuplicates) colors.splice(index, 1);
    }
}

function createGameRow(isActive = false) {
    const row = document.createElement('div');
    row.className = `game-row ${isActive ? 'active-row' : ''}`;
    row.innerHTML = `
							<div class="d-flex justify-content-between align-items-center">
									<div class="d-flex align-items-center">
											<div class="d-flex">
													<div class="game-peg" style="background-color: #fff"></div>
													<div class="game-peg" style="background-color: #fff"></div>
													<div class="game-peg" style="background-color: #fff"></div>
													<div class="game-peg" style="background-color: #fff"></div>
											</div>
											<div class="row-controls">
													<button class="btn btn-primary btn-sm submit-guess">Submit Guess</button>
													<button class="btn btn-secondary btn-sm run-solver"><i class="fas fa-magic"></i> Run Solver</button>
											</div>
									</div>
									<div class="d-flex flex-wrap" style="width: 50px">
											<div class="feedback-peg" style="background-color: #fff"></div>
											<div class="feedback-peg" style="background-color: #fff"></div>
											<div class="feedback-peg" style="background-color: #fff"></div>
											<div class="feedback-peg" style="background-color: #fff"></div>
									</div>
							</div>
					`;

    const submitBtn = row.querySelector('.submit-guess');
    submitBtn.addEventListener('click', handleSubmitGuess);

    const solverBtn = row.querySelector('.run-solver');
    solverBtn.addEventListener('click', handleSolve);

    return row;
}

function calculateFeedback(guess) {
    const { exact, partial } = computeFeedback(guess, secretCode);
    return { exactMatches: exact, colorMatches: partial };
}


function updateStatusMessage(message) {
    const statusElement = document.querySelector(".status-message");
    statusElement.textContent = message;
}

function generateConfetti(emoji_str) {
    // Reveal secret code
    const secretPegs = document.querySelectorAll('.secret-row .game-peg');
    secretCode.forEach((color, index) => {
        secretPegs[index].textContent = '';
        secretPegs[index].style.backgroundColor = colorMap[color];
    });

    // Create party emoji explosion
    const confettiCount = 150;
    for (let i = 0; i < confettiCount; i++) {
        const timer = setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.className = 'game-confetti';
            emoji.textContent = emoji_str;
            emoji.style.position = 'fixed';
            emoji.style.left = Math.random() * window.innerWidth + 'px';
            emoji.style.top = '-20px';
            emoji.style.fontSize = '2rem';

            // Some rotate clockwise, while others rotate anticlockwise
            const clockwise = Math.random() > 0.5;
            const rotationDirection = clockwise ? 720 : -720;

            emoji.style.animation = `confetti-fall 4s ease-out`;
            emoji.style.setProperty('--rotate-angle', `${rotationDirection}deg`);

            document.body.appendChild(emoji);
            endGameTimers.push(setTimeout(() => emoji.remove(), 3000));
        }, i * 50);
        endGameTimers.push(timer);
    }
}

function handleSubmitGuess() {
    const currentActiveRow = document.querySelector('.active-row');
    if (!currentActiveRow || gameOver) return;
    const guessColors = Array.from(currentActiveRow.querySelectorAll('.game-peg'))
        .map(peg => peg.dataset.color === undefined ? null : Number(peg.dataset.color));

    // Validate all pegs are filled
    if (guessColors.some(color => color === null)) {
        alert('Please fill all pegs before submitting!');
        return;
    }

    evaluateGuess(guessColors);
}

function handleSolve() {
    if (gameOver) return;
    // Call solver with current state to figure out best guess
    const solverGuess = solverFn(state, selectedColorCount, maxGuesses - 1 - currentRow, allowDuplicates);
    if (!solverGuess) {
        updateStatusMessage('No valid code matches the feedback.');
        return;
    }

    const currentActiveRow = document.querySelector('.active-row');
    const pegElements = Array.from(currentActiveRow.querySelectorAll('.game-peg'))

    for (let i = 0; i < pegElements.length; i++) {
        pegElements[i].style.backgroundColor = colorMap[solverGuess[i]];
        pegElements[i].dataset.color = solverGuess[i];
    }

    evaluateGuess(solverGuess);
}

function evaluateGuess(guess) {
    const currentActiveRow = document.querySelector('.active-row');
    const feedback = calculateFeedback(guess);
    const feedbackPegs = currentActiveRow.querySelectorAll('.feedback-peg');

    // Save state
    for (let i = 0; i < 4; i++) {
        state[maxGuesses - 1 - currentRow][i] = guess[i];
    }

    // Display feedback (black for exact matches, white for color matches)
    // Also save feedback to state
    let pegIndex = 0;
    for (let i = 0; i < feedback.exactMatches; i++) {
        state[maxGuesses - 1 - currentRow][4 + pegIndex] = 2;
        feedbackPegs[pegIndex++].style.backgroundColor = '#000';
    }
    for (let i = 0; i < feedback.colorMatches; i++) {
        state[maxGuesses - 1 - currentRow][4 + pegIndex] = 1;
        feedbackPegs[pegIndex++].style.backgroundColor = '#888';
    }

    // Fill remaining feedback slots in state with zeros
    for (let i = 4 + pegIndex; i < 8; i++) {
        state[maxGuesses - 1 - currentRow][i] = 0;
    }

    // Check win condition
    if (feedback.exactMatches === 4) {
        gameOver = true;
        currentActiveRow.classList.remove('active-row');
        updateStatusMessage("You've won!");
        generateConfetti('🎉');
        endGameTimers.push(setTimeout(() => {
            $('#restart-modal').modal('show');
        }, 8000));
        return;
    }

    // Move to next row if not last guess
    if (currentRow > 0) {
        currentActiveRow.classList.remove('active-row');
        const nextRow = gameBoard.children[--currentRow + 1]; 
        nextRow.classList.add('active-row');
        initializeDragAndDrop();
    } else {
        gameOver = true;
        currentActiveRow.classList.remove('active-row');
        updateStatusMessage("You've lost!");
        generateConfetti('❌');
        endGameTimers.push(setTimeout(() => {
            $('#restart-modal').modal('show');
        }, 8000));
    }
}

function initializeGame() {
    endGameTimers.forEach(clearTimeout);
    endGameTimers = [];
    document.querySelectorAll('.game-confetti').forEach(emoji => emoji.remove());
    gameOver = false;
    state = [];
    gameBoard.innerHTML = '';
    currentRow = maxGuesses - 1;

    for (let i = 0; i < maxGuesses; i++) {
        state.push([null, null, null, null, null, null, null, null]);
    }

    filterColors();

    // Generate secret code
    generateSecretCode();

    // Add secret row at top
    gameBoard.appendChild(createSecretRow());

    // Create rows from bottom to top
    for (let i = 0; i < maxGuesses; i++) {
        const row = createGameRow(i === maxGuesses - 1);
        gameBoard.appendChild(row);
    }

    initializeDragAndDrop();
}

function initializeDragAndDrop() {
    const activeRow = document.querySelector('.active-row');
    const gamePegs = activeRow.querySelectorAll('.game-peg');

    gamePegs.forEach(peg => {
        peg.addEventListener('dragenter', handleDragEnter);
        peg.addEventListener('dragover', handleDragOver);
        peg.addEventListener('dragleave', handleDragLeave);
        peg.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    if (gameOver || e.target.style.display === 'none') {
        e.preventDefault();
        return;
    }
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.color);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('droppable');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragLeave(e) {
    e.target.classList.remove('droppable');
}

function handleDrop(e) {
    e.preventDefault();
    const droppedColor = e.dataTransfer.getData('text/plain');
    const color = Number(droppedColor);
    if (gameOver || !e.target.closest('.active-row') || !Number.isInteger(color) ||
        droppedColor === '' || color < 0 || color >= selectedColorCount) return;
    e.target.style.backgroundColor = colorMap[color];
    e.target.dataset.color = color;
    e.target.classList.remove('droppable');
}

startGameBtn.addEventListener('click', () => {
    const colorCount = Number(document.getElementById('color-count').value);
    const guessCount = Number(document.getElementById('max-guesses').value);
    if (!Number.isInteger(colorCount) || colorCount < 4 || colorCount > 8 ||
        !Number.isInteger(guessCount) || guessCount < 2 || guessCount > 10) {
        alert('Choose 4–8 colors and 2–10 guesses.');
        return;
    }
    selectedColorCount = colorCount;
    maxGuesses = guessCount;
    allowDuplicates = document.getElementById('allow-duplicates').checked;
    gameSetup.style.display = 'none';
    gameBoard.style.display = 'block';
    colorPicker.style.display = 'block';

    solverFn = document.getElementById('logic-solver').checked ? solve_logic : solve_knuth;

    initializeGame();
});

document.querySelectorAll('.color-picker').forEach(picker => {
    picker.addEventListener('dragstart', handleDragStart);
    picker.addEventListener('dragend', handleDragEnd);
});

restartGameBtnSameSettings.addEventListener('click', function() {
    $('#restart-modal').modal('hide');
    initializeGame();
});

restartGameBtnDifferentSettings.addEventListener('click', function() {
    location.reload();
});
