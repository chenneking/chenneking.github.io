// State is a max_guesses x 8 matrix. Each row represents a step in the game. The first 4 values of the step are the user choice, the last 4 values are the feedback.
// Color indices start with 0. Feedback values are: 2 = right color, right location; 1 = right color; 0 = nothing.
let state = [];
let secretCode = [];

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

let inverseColorMap = {
    '#ff0000': 0,
    '#00ff00': 1,
    '#0000ff': 2,
    '#ffff00': 3,
    '#ff00ff': 4,
    '#00ffff': 5,
    '#ff8800': 6,
    '#8800ff': 7
}

const gameSetup = document.getElementById('game-setup');
const colorPicker = document.getElementById('color-picker');
const gameBoard = document.getElementById('game-board');
const startGameBtn = document.getElementById('start-game-btn');

const componentToHex = (c) => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

const rgbToHex = (r, g, b) => {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const rgbStringToHex = (s) => {
    let sliced = s.slice(4, -1)
    let vals = sliced.split(', ')
    let int_vals = [parseInt(vals[0]), parseInt(vals[1]), parseInt(vals[2])]
    return rgbToHex(int_vals[0], int_vals[1], int_vals[2])
}


function filterColors() {
    selected_color_count = parseInt(document.getElementById("color-count").value);
    const allPickers = document.querySelectorAll(".color-picker");
    allPickers.forEach((picker, index) => {
        picker.style.display = index < selected_color_count ? "block" : "none";
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
    const allowDuplicates = document.getElementById("allow-duplicates").checked;
    const colorCount = parseInt(document.getElementById("color-count").value);
    const allColors = Array.from(document.querySelectorAll(".color-picker"))
        .filter(picker => picker.style.display !== "none")
        .map(picker => picker.style.backgroundColor)
        .map(col => rgbStringToHex(col));

    secretCode = [];
    while (secretCode.length < 4) {
        const randomColor = allColors[Math.floor(Math.random() * colorCount)];
        if (!allowDuplicates && secretCode.includes(randomColor)) {
            continue;
        }
        secretCode.push(randomColor);
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
													<button class="btn btn-secondary btn-sm run-solver">
															<i class="fas fa-magic"></i> Run Solver
													</button>
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
    const secretCopy = [...secretCode];
    const guessCopy = [...guess];
    let exactMatches = 0;
    let colorMatches = 0;

    // First pass: count exact matches
    for (let i = 0; i < secretCopy.length; i++) {
        if (guessCopy[i] === secretCopy[i]) {
            exactMatches++;
            secretCopy[i] = null;
            guessCopy[i] = null;
        }
    }

    // Second pass: count color matches
    for (let i = 0; i < guessCopy.length; i++) {
        if (guessCopy[i] === null) continue;

        const colorIndex = secretCopy.indexOf(guessCopy[i]);
        if (colorIndex !== -1) {
            colorMatches++;
            secretCopy[colorIndex] = null;
        }
    }

    return { exactMatches, colorMatches };
}

function scoreGuess(guess) {
    let feedback = calculateFeedback(guess)
    return feedback.exactMatches * 2 + feedback.colorMatches;
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
        secretPegs[index].style.backgroundColor = color;
    });

    // Create party emoji explosion
    const confettiCount = 150;
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
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
            setTimeout(() => emoji.remove(), 3000);
        }, i * 50);
    }
}

function handleSubmitGuess() {
    const currentActiveRow = document.querySelector('.active-row');
    let guessColors = Array.from(currentActiveRow.querySelectorAll('.game-peg'))
        .map(peg => peg.style.backgroundColor);

    // RGB -> Hex conversion
    guessColors = guessColors.map(color => rgbStringToHex(color));

    // Validate all pegs are filled
    if (guessColors.includes('#ffffff') || guessColors.includes('')) {
        alert('Please fill all pegs before submitting!');
        return;
    }

    evaluateGuess(guessColors);
}

function handleSolve() {
    // Call solver with current state to figure out best guess
    let solver_guess = solver_fn(state, selected_color_count, max_guesses - 1 - currentRow);

    let guessColors = solver_guess.map(id => colorMap[id]);

    const currentActiveRow = document.querySelector('.active-row');
    const pegElements = Array.from(currentActiveRow.querySelectorAll('.game-peg'))

    for (let i = 0; i < pegElements.length; i++) {
        pegElements[i].style.backgroundColor = guessColors[i];
    }

    evaluateGuess(guessColors);
}

function evaluateGuess(guessColors) {
    const currentActiveRow = document.querySelector('.active-row');
    const feedback = calculateFeedback(guessColors);
    const feedbackPegs = currentActiveRow.querySelectorAll('.feedback-peg');

    // Save state
    for (let i = 0; i < 4; i++) {
        state[max_guesses - 1 - currentRow][i] = inverseColorMap[guessColors[i]];
    }

    // Display feedback (black for exact matches, white for color matches)
    // Also save feedback to state
    let pegIndex = 0;
    for (let i = 0; i < feedback.exactMatches; i++) {
        state[max_guesses - 1 - currentRow][4 + pegIndex] = 2;
        feedbackPegs[pegIndex++].style.backgroundColor = '#000';
    }
    for (let i = 0; i < feedback.colorMatches; i++) {
        state[max_guesses - 1 - currentRow][4 + pegIndex] = 1;
        feedbackPegs[pegIndex++].style.backgroundColor = '#888';
    }

    // Fill remaining feedback slots in state with zeros
    for (let i = 4 + pegIndex; i < 8; i++) {
        state[max_guesses - 1 - currentRow][i] = 0;
    }

    // Check win condition
    if (feedback.exactMatches === 4) {
        updateStatusMessage("You've Won!");
        generateConfetti('🎉');
        return;
    }

    // Move to next row if not last guess
    if (currentRow > 0) {
        currentActiveRow.classList.remove('active-row');
        const nextRow = gameBoard.children[--currentRow + 1]; // +1 for secret row
        nextRow.classList.add('active-row');
        initializeDragAndDrop();
    } else {
        const secretPegs = document.querySelectorAll('.secret-row .game-peg');
        secretCode.forEach((color, index) => {
            secretPegs[index].textContent = '';
            secretPegs[index].style.backgroundColor = color;
        });
        updateStatusMessage("You've Lost!");
        generateConfetti('❌');
    }
}

function initializeGame() {
    gameBoard.innerHTML = '';
    currentRow = max_guesses - 1;

    for (let i = 0; i < max_guesses; i++) {
        state.push([null, null, null, null, null, null, null, null]);
    }

    filterColors();

    // Generate secret code
    generateSecretCode();

    // Add secret row at top
    gameBoard.appendChild(createSecretRow());

    // Create rows from bottom to top
    for (let i = 0; i < max_guesses; i++) {
        const row = createGameRow(i === max_guesses - 1);
        gameBoard.appendChild(row);
    }

    initializeDragAndDrop();
}

function initializeDragAndDrop() {
    const colorPickers = document.querySelectorAll('.color-picker');
    const activeRow = document.querySelector('.active-row');
    const gamePegs = activeRow.querySelectorAll('.game-peg');

    colorPickers.forEach(picker => {
        picker.addEventListener('dragstart', handleDragStart);
        picker.addEventListener('dragend', handleDragEnd);
        picker.addEventListener('touchstart', handleTouchStart);
        picker.addEventListener('touchmove', handleTouchMove);
        picker.addEventListener('touchend', handleTouchEnd);
    });

    gamePegs.forEach(peg => {
        peg.addEventListener('dragenter', handleDragEnter);
        peg.addEventListener('dragover', handleDragOver);
        peg.addEventListener('dragleave', handleDragLeave);
        peg.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.style.backgroundColor);
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
    const color = e.dataTransfer.getData('text/plain');
    e.target.style.backgroundColor = color;
    e.target.classList.remove('droppable');
}

let currentTouchTarget = null;

// Handle touchstart for mobile drag
function handleTouchStart(e) {
    currentTouchTarget = e.target;
    currentTouchTarget.classList.add('dragging');
    const rect = currentTouchTarget.getBoundingClientRect();
    // Store the offset between touch point and element's top-left corner
    currentTouchTarget.touchOffsetX = e.touches[0].clientX - rect.left;
    currentTouchTarget.touchOffsetY = e.touches[0].clientY - rect.top;
    e.preventDefault();
}

// Handle touchmove for mobile drag
function handleTouchMove(e) {
    if (!currentTouchTarget) return;
    const touch = e.touches[0];
    // Position the element under the finger
    currentTouchTarget.style.position = 'fixed';
    currentTouchTarget.style.zIndex = '1000';
    currentTouchTarget.style.left = (touch.clientX - currentTouchTarget.touchOffsetX) + 'px';
    currentTouchTarget.style.top = (touch.clientY - currentTouchTarget.touchOffsetY) + 'px';
    e.preventDefault();
}

// Handle touchend to simulate a drop
function handleTouchEnd(e) {
    if (!currentTouchTarget) return;
    const touch = e.changedTouches[0];
    // Determine drop target using elementFromPoint
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    currentTouchTarget.classList.remove('dragging');
    // Reset inline styles
    currentTouchTarget.style.position = '';
    currentTouchTarget.style.zIndex = '';
    currentTouchTarget.style.left = '';
    currentTouchTarget.style.top = '';
    
    // If dropped on a game peg, set its background color
    if (dropTarget && dropTarget.classList.contains('game-peg')) {
         dropTarget.style.backgroundColor = currentTouchTarget.style.backgroundColor;
    }
    
    currentTouchTarget = null;
    e.preventDefault();
}

startGameBtn.addEventListener('click', () => {
    gameSetup.style.display = 'none';
    gameBoard.style.display = 'block';
    colorPicker.style.display = 'block';

    max_guesses = parseInt(document.getElementById('max-guesses').value);
    currentRow = max_guesses - 1;

    solver_choice = document.getElementById('logic-solver').checked ? 'logic' : 'knuth';
    solver_fn = solver_choice == 'logic' ? solve_logic : solve_knuth;

    initializeGame();
});