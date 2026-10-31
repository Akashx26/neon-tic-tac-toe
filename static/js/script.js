
/* ==========================================
   NEON TIC TAC TOE
   Complete Frontend JavaScript
========================================== */


// ==========================================
// 1. ELEMENT REFERENCES
// ==========================================

const startGameBtn = document.getElementById("start-game-btn");
const newMatchBtn = document.getElementById("new-match-btn");
const resetGameBtn = document.getElementById("reset-game-btn");

const cells = document.querySelectorAll(".cell");
const gameBoard = document.getElementById("game-board");

const turnMessage = document.getElementById("turn-message");
const resultText = document.getElementById("result-text");

const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreDraw = document.getElementById("score-draw");

const difficultyGroup = document.getElementById("difficulty-group");
const symbolGroup = document.getElementById("symbol-group");


// ==========================================
// 2. GAME CONFIGURATION
// ==========================================

let selectedMode = "VS Computer";
let selectedDifficulty = "Medium";
let selectedSymbol = "X";

let gameState = null;
let isRequesting = false;

// Time between the player's move and computer's move.
const COMPUTER_MOVE_DELAY = 350;


// ==========================================
// 3. WINNING COMBINATIONS
// ==========================================

const winningCombinations = [

    // Horizontal
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    // Vertical
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    // Diagonal
    [0, 4, 8],
    [2, 4, 6]

];


function getWinningCombination(board, winner) {

    if (!winner || winner === "Draw") {
        return null;
    }

    return winningCombinations.find(combination => {

        return combination.every(position => {
            return board[position] === winner;
        });

    }) || null;

}


// ==========================================
// 4. API HELPER
// ==========================================

async function apiRequest(url, data = null) {

    const options = {
        method: data === null ? "GET" : "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Something went wrong."
        );
    }

    return result;

}


// ==========================================
// 5. SMALL DELAY HELPER
// ==========================================

function wait(milliseconds) {

    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });

}


// ==========================================
// 6. SCOREBOARD
// ==========================================

function updateScoreboard(state = gameState) {

    if (!state || !state.scores_by_mode) {
        return;
    }

    const currentScores = state.scores_by_mode[state.mode];

    if (!currentScores) {
        return;
    }

    scoreX.textContent = currentScores.X;
    scoreO.textContent = currentScores.O;
    scoreDraw.textContent = currentScores.Draws;

}


// ==========================================
// 7. WINNING LINE ANIMATION
// ==========================================

function drawWinningLine(combination) {

    if (!combination) {
        return;
    }

    // Remove any previous winning line.
    const previousLine =
        gameBoard.querySelector(".winning-line-svg");

    if (previousLine) {
        previousLine.remove();
    }

    const boardRect = gameBoard.getBoundingClientRect();

    const width = boardRect.width;
    const height = boardRect.height;

    // Get the first and last winning cells.
    const firstCell = cells[combination[0]];
    const lastCell = cells[combination[2]];

    const firstRect = firstCell.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();

    // Calculate coordinates relative to the board.
    const x1 =
        firstRect.left + firstRect.width / 2 - boardRect.left;

    const y1 =
        firstRect.top + firstRect.height / 2 - boardRect.top;

    const x2 =
        lastRect.left + lastRect.width / 2 - boardRect.left;

    const y2 =
        lastRect.top + lastRect.height / 2 - boardRect.top;

    // Create SVG.
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");

    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("winning-line-svg");

    // Create the winning line.
    const line = document.createElementNS(svgNS, "line");

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);

    line.setAttribute("stroke", "#39ff88");
    line.setAttribute("stroke-width", "5");
    line.setAttribute("stroke-linecap", "round");

    line.classList.add("winning-line");

    svg.appendChild(line);
    gameBoard.appendChild(svg);

    // Calculate the actual line length.
    const length = line.getTotalLength();

    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;

    // Start the drawing animation.
    requestAnimationFrame(() => {
        line.classList.add("draw");
    });

}


// ==========================================
// 8. RENDER GAME STATE
// ==========================================

function renderGame(state) {

    const previousBoard = gameState
        ? [...gameState.board]
        : null;

    // Save the new state.
    gameState = state;

    // Remove the previous winning line.
    const oldLine =
        gameBoard.querySelector(".winning-line-svg");

    if (oldLine) {
        oldLine.remove();
    }

    // ======================================
    // RENDER BOARD
    // ======================================

    cells.forEach((cell, index) => {

        const symbol = state.board[index];

        // Clear previous content.
        cell.replaceChildren();

        cell.classList.remove(
            "x",
            "o",
            "winning",
            "placed"
        );

        // Display the symbol.
        if (symbol !== "") {

            const symbolElement = document.createElement("span");

            symbolElement.classList.add("symbol-mark");
            symbolElement.textContent = symbol;

            cell.appendChild(symbolElement);

            if (symbol === "X") {
                cell.classList.add("x");
            }

            if (symbol === "O") {
                cell.classList.add("o");
            }

            // Animate newly placed symbols only.
            if (
                previousBoard &&
                previousBoard[index] === ""
            ) {
                cell.classList.add("placed");
            }

        }

        // Disable occupied cells and prevent clicks
        // while it is the computer's turn.
        const computerTurn =
            state.mode === "VS Computer" &&
            state.turn === state.computer_symbol;

        cell.disabled =
            !state.active ||
            state.game_over ||
            symbol !== "" ||
            computerTurn;

    });


    // ======================================
    // TURN INDICATOR
    // ======================================

    if (!state.active) {

        turnMessage.textContent =
            "CONFIGURE YOUR GAME TO BEGIN";

    } else if (state.game_over) {

        turnMessage.textContent =
            "MATCH COMPLETED";

    } else if (
        state.mode === "VS Computer" &&
        state.turn === state.computer_symbol
    ) {

        turnMessage.textContent =
            `COMPUTER TURN - ${state.computer_symbol}`;

    } else {

        turnMessage.textContent =
            `YOUR TURN - ${state.turn}`;

    }


    // ======================================
    // MATCH RESULT
    // ======================================

    if (state.game_over) {

        if (state.winner === "Draw") {

            resultText.textContent = "IT'S A DRAW!";

        } else if (state.mode === "VS Computer") {

            resultText.textContent =
                state.winner === state.human_symbol
                    ? "YOU WIN! AMAZING!"
                    : "COMPUTER WINS! TRY AGAIN!";

        } else {

            resultText.textContent =
                `PLAYER ${state.winner} WINS!`;

        }

    } else {

        resultText.textContent = "";

    }


    // ======================================
    // WINNING CELL HIGHLIGHT
    // ======================================

    if (
        state.game_over &&
        state.winner !== "Draw"
    ) {

        const combination = getWinningCombination(
            state.board,
            state.winner
        );

        if (combination) {

            combination.forEach(position => {
                cells[position].classList.add("winning");
            });

            // Draw the winning line after the board renders.
            requestAnimationFrame(() => {
                drawWinningLine(combination);
            });

        }

    }

    // Update the backend-powered scoreboard.
    updateScoreboard(state);

}


// ==========================================
// 9. COMPUTER TURN
// ==========================================

async function playComputerTurn() {

    if (!gameState) {
        return;
    }

    const computerTurn =
        gameState.mode === "VS Computer" &&
        gameState.active &&
        !gameState.game_over &&
        gameState.turn === gameState.computer_symbol;

    if (!computerTurn) {
        return;
    }

    // The player's move has already been rendered.
    // Wait before asking the backend for the computer move.
    await wait(COMPUTER_MOVE_DELAY);

    // Recheck the state in case the game was changed.
    const stillComputerTurn =
        gameState &&
        gameState.mode === "VS Computer" &&
        gameState.active &&
        !gameState.game_over &&
        gameState.turn === gameState.computer_symbol;

    if (!stillComputerTurn) {
        return;
    }

    const state = await apiRequest(
        "/api/computer-move",
        {}
    );

    renderGame(state);

}


// ==========================================
// 10. SELECT GAME MODE
// ==========================================

document.querySelectorAll("[data-mode]").forEach(button => {

    button.addEventListener("click", () => {

        selectedMode = button.dataset.mode;

        document.querySelectorAll("[data-mode]").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        // Show or hide computer settings.
        const computerMode =
            selectedMode === "VS Computer";

        difficultyGroup.style.display =
            computerMode ? "block" : "none";

        symbolGroup.style.display =
            computerMode ? "block" : "none";

        // Display the selected mode's scores.
        updateScoreboard({
            ...gameState,
            mode: selectedMode
        });

    });

});


// ==========================================
// 11. SELECT DIFFICULTY
// ==========================================

document.querySelectorAll("[data-difficulty]").forEach(button => {

    button.addEventListener("click", () => {

        selectedDifficulty = button.dataset.difficulty;

        document.querySelectorAll("[data-difficulty]").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

    });

});


// ==========================================
// 12. SELECT PLAYER SYMBOL
// ==========================================

document.querySelectorAll("[data-symbol]").forEach(button => {

    button.addEventListener("click", () => {

        selectedSymbol = button.dataset.symbol;

        document.querySelectorAll("[data-symbol]").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

    });

});


// ==========================================
// 13. START GAME / NEW MATCH
// ==========================================

async function startNewMatch() {

    if (isRequesting) {
        return;
    }

    isRequesting = true;

    startGameBtn.disabled = true;
    newMatchBtn.disabled = true;

    try {

        const state = await apiRequest(
            "/api/new-game",
            {
                mode: selectedMode,
                difficulty: selectedDifficulty,
                symbol: selectedSymbol
            }
        );

        // First display the empty board.
        renderGame(state);

        // If the computer starts this match,
        // its move will happen after the same short delay.
        await playComputerTurn();

    } catch (error) {

        alert(error.message);

    } finally {

        isRequesting = false;

        startGameBtn.disabled = false;
        newMatchBtn.disabled = false;

    }

}


// Start Game button.
startGameBtn.addEventListener(
    "click",
    startNewMatch
);


// New Match button.
newMatchBtn.addEventListener(
    "click",
    startNewMatch
);


// ==========================================
// 14. PLAYER MOVES
// ==========================================

cells.forEach(cell => {

    cell.addEventListener("click", async () => {

        if (
            isRequesting ||
            !gameState ||
            !gameState.active ||
            gameState.game_over
        ) {
            return;
        }

        const position = Number(cell.dataset.position);

        if (
            !Number.isInteger(position) ||
            position < 0 ||
            position > 8 ||
            gameState.board[position] !== ""
        ) {
            return;
        }

        isRequesting = true;

        try {

            // STEP 1:
            // Send only the player's move to Flask.
            const playerState = await apiRequest(
                "/api/move",
                {
                    position: position
                }
            );

            // STEP 2:
            // Immediately display the player's move.
            renderGame(playerState);

            // STEP 3:
            // If the game is not over, wait and let
            // the computer make its separate move.
            await playComputerTurn();

        } catch (error) {

            alert(error.message);

        } finally {

            isRequesting = false;

        }

    });

});


// ==========================================
// 15. RESET GAME AND BOTH SCOREBOARDS
// ==========================================

resetGameBtn.addEventListener("click", async () => {

    if (isRequesting) {
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to reset both scoreboards?"
    );

    if (!confirmed) {
        return;
    }

    isRequesting = true;
    resetGameBtn.disabled = true;

    try {

        const state = await apiRequest(
            "/api/reset",
            {}
        );

        // Restore default configuration.
        selectedMode = state.mode;
        selectedDifficulty = state.difficulty;
        selectedSymbol = state.human_symbol;

        // Update selected buttons in the interface.
        document.querySelectorAll("[data-mode]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.mode === selectedMode
            );
        });

        document.querySelectorAll("[data-difficulty]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.difficulty === selectedDifficulty
            );
        });

        document.querySelectorAll("[data-symbol]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.symbol === selectedSymbol
            );
        });

        difficultyGroup.style.display = "block";
        symbolGroup.style.display = "block";

        renderGame(state);

    } catch (error) {

        alert(error.message);

    } finally {

        isRequesting = false;
        resetGameBtn.disabled = false;

    }

});


// ==========================================
// 16. INITIALIZE APPLICATION
// ==========================================

async function initializeGame() {

    // Disable the board until the server state loads.
    cells.forEach(cell => {
        cell.disabled = true;
        cell.replaceChildren();
    });

    turnMessage.textContent = "LOADING GAME...";
    resultText.textContent = "";

    try {

        // Restore the current game from the Flask session.
        const state = await apiRequest("/api/state");

        selectedMode = state.mode;
        selectedDifficulty = state.difficulty;
        selectedSymbol = state.human_symbol;

        // Restore selected configuration buttons.
        document.querySelectorAll("[data-mode]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.mode === selectedMode
            );
        });

        document.querySelectorAll("[data-difficulty]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.difficulty === selectedDifficulty
            );
        });

        document.querySelectorAll("[data-symbol]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.symbol === selectedSymbol
            );
        });

        const computerMode =
            selectedMode === "VS Computer";

        difficultyGroup.style.display =
            computerMode ? "block" : "none";

        symbolGroup.style.display =
            computerMode ? "block" : "none";

        renderGame(state);

        // If the page was refreshed during the computer's turn,
        // continue the computer's move after the short delay.
        if (!isRequesting) {

            isRequesting = true;

            try {
                await playComputerTurn();
            } finally {
                isRequesting = false;
            }

        }

    } catch (error) {

        console.error("Unable to initialize game:", error);

        turnMessage.textContent =
            "UNABLE TO LOAD GAME. REFRESH THE PAGE.";

    }

}


// ==========================================
// 17. START APPLICATION
// ==========================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeGame
    );

} else {

    initializeGame();

}
