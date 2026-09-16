const BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "";

const username = localStorage.getItem("username");

let autoSaveTimer = null;
let user_id = null;
// 4x4 board size
const size = 4;
let steps = 0;
// Generate numbers 1-15 and 0
let board = [];
for (let i = 0; i < size * size; i++) {
    board.push(i);
}

// Load game data from the server
async function loadGame(){
    const loading = document.getElementById("loading");
    loading.style.display = "block";

    // If no username exists, then treat as a first-time user
    if(!username) {
        console.warn("No username found");
        shuffleBoard();
        render();
        return;
    }

    try{
        // Request saved game data from backend
        const res = await fetch(`${BASE}/api/klotski/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({username})
        });

        const data = await res.json();
        loading.style.display = "none";
        // If no save data exists, initialize a new game
        if (!data.exists) {
            console.log("No save found");
            user_id = data.user_id;
            shuffleBoard();
            steps = 0;
            render();
            return;
        }
        // Load existing save data
        user_id = data.user_id;
        board = data.board.tiles;
        steps = data.current_steps;
        render();
    } catch (err) {
        console.error("Load failed", err);
        loading.style.display = "none";
        shuffleBoard();
        steps = 0;
        render();
    }
}

// Save current game state to the server
async function saveGame() {
    try{
        // If user not logged in, skip saving
        if (!username) return;
        // Send game state to backend for saving 
        await fetch(`${BASE}/api/klotski/save`,{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user_id,
                board: { tiles: board },
                current_steps: steps
            })
        });
        console.log("Game Saved");
    } catch (err) {
        console.error( "Auto save failed", err);
    }
}

// Upload steps to leaderboard
async function uploadScore(bestSteps) {
    if (!user_id) {
        console.error("No user id");
        return;
    }
    try {
        await fetch(`${BASE}/api/klotski/leaderboard/save`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id,
                best_steps: bestSteps
            })
        });
        console.log("Leaderboard updated!");
    } catch (err) {
        console.error("Failed to upload score:", err);
    }
}

function shuffleBoard() {
    do {
        // Shuffle
        for (let i = board.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [board[i], board[j]] = [board[j], board[i]];
        }
    } while (!isSolvable(board));
}

function isSolvable(arr) {
    let inv = 0;

    // Count inversions
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] > 0 && arr[j] > 0 && arr[i] > arr[j]) inv++;
        }
    }

    // Find the blank tile,
    // and calculate its row from the bottom while bottom row = 1
    const blank = arr.indexOf(0);
    const blankRow = size - Math.floor(blank / size);

    return (inv + blankRow) % 2 === 1;
}

// Check if puzzle is solved
function isFinished() {
    for (let i = 0; i < 15; i++) {
        if (board[i] !== i + 1) return false;
    }
    return true;
}

// Attempt to move a tile (only if adjacent to empty tile)
function tryMove(index) {
    const blank = board.indexOf(0);

    const validMoves = [];

    // Check adjacency
    if (index - size === blank) validMoves.push(blank);
    if (index + size === blank) validMoves.push(blank);
    if (index % size !== 0 && index - 1 === blank) validMoves.push(blank);
    if (index % size !== size - 1 && index + 1 === blank) validMoves.push(blank);

    if (validMoves.length > 0) {
        [board[index], board[blank]] = [board[blank], board[index]];
        steps++;
        render();
        autoSave();
    }
}

function autoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveGame, 1000);
}

// Board DOM
const boardDiv = document.getElementById("board");

// Render the board
function render() {
    boardDiv.innerHTML = "";

    board.forEach((num, index) => {
        const div = document.createElement("div");
        div.classList.add("tile");

        if (num > 0) {
            div.innerText = num;
            div.onclick = () => tryMove(index);
        } else {
            div.classList.add("empty");
        }

        boardDiv.appendChild(div);
    });

    if (isFinished()) {
        setTimeout(() => {
            document.getElementById("winSteps").innerText = steps;
            document.getElementById("winPopup").classList.add("show");
            uploadScore(steps);
        }, 200);
    }
    document.getElementById("Counter").innerText = "Steps: " + steps;
}

document.getElementById("restartBtn1").onclick = restartGame;
document.getElementById("restartBtn2").onclick = restartGame;
document.getElementById("saveBtn").onclick = saveGame;
document.getElementById("leaderboardBtn").onclick = () => {
    localStorage.setItem("leaderboardFrom", "../klotski/index.html");
    window.location.href = "../leaderboard/index.html";
}

function restartGame() {
    shuffleBoard();
    steps = 0;
    document.getElementById("Counter").innerText = "Steps: 0";
    document.getElementById("winPopup").classList.remove("show");
    render();
}

// Initialize the game
loadGame();
