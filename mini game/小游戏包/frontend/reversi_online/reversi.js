const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
// const restartBtn = document.getElementById("restart");

const socket = io(window.location.origin);

socket.on("match_wait", () => {
  statusEl.textContent = "Waiting for an opponent...";
});

socket.on("match_start", data => {
  board = data.board;
  current = data.current;
  running = true;
  render();
});

socket.on("board_update", data => {
  board = data.board;
  current = data.current;
  render();
});

socket.on("game_over", data => {
  board = data.board;
  running = false;
  if (data.winner === "Draw") statusEl.textContent = "Draw!";
  else statusEl.textContent = (data.winner === "B" ? "Black" : "White") + " wins!";
  render();
});

socket.on("opponent_left", data => {
  statusEl.textContent = data.winner + " wins (opponent disconnected)";
  running = false;
});

let board;
let current = "B"; // B, W
let running = true;

const dirs = [
  [-1, -1],[-1, 0],[-1, 1],
  [ 0, -1],        [ 0, 1],
  [ 1, -1],[ 1, 0],[ 1, 1]
];

function init() {
  board = Array(64).fill(null);

  // starting position
  board[27] = "W";
  board[28] = "B";
  board[35] = "B";
  board[36] = "W";

  current = "B";
  running = true;
  render();
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function index(r, c) {
  return r * 8 + c;
}

function validMoves(player) {
  const moves = [];
  board.forEach((cell, i) => {
    if (!cell && flips(i, player).length) moves.push(i);
  });
  return moves;
}

function flips(i, player) {
  if (board[i]) return [];

  const opp = player === "B" ? "W" : "B";
  const r = Math.floor(i / 8);
  const c = i % 8;
  const result = [];

  dirs.forEach(([dr, dc]) => {
    let rr = r + dr;
    let cc = c + dc;
    const line = [];

    while (inBounds(rr, cc) && board[index(rr, cc)] === opp) {
      line.push(index(rr, cc));
      rr += dr; cc += dc;
    }

    if (line.length && inBounds(rr, cc) && board[index(rr, cc)] === player) {
      result.push(...line);
    }
  });

  return result;
}

function render() {
  boardEl.innerHTML = "";

  board.forEach((cell, i) => {
    const btn = document.createElement("button");
    btn.className = "cell";

    if (cell) {
      const piece = document.createElement("div");
      piece.className = "piece " + (cell === "B" ? "black" : "white");
      btn.appendChild(piece);
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        socket.emit("play_move", i);
      });
    }

    boardEl.appendChild(btn);
  });

  if (!running) {
    const b = board.filter(x => x === "B").length;
    const w = board.filter(x => x === "W").length;
    if (b === w) statusEl.textContent = "Draw!";
    else statusEl.textContent = (b > w ? "Black" : "White") + " wins!";
    return;
  }

  if (running) {
    statusEl.textContent = `${current === "B" ? "Black" : "White"}'s turn`;
  }
}

restartBtn.addEventListener("click", init);

init();

