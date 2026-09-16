const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

let board;
let current = "B"; // B = human, W = AI
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

  current = "B"; // human starts
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

function play(i) {
  if (!running) return;
  const moves = validMoves(current);
  if (!moves.includes(i)) return;

  const f = flips(i, current);
  board[i] = current;
  f.forEach(idx => board[idx] = current);

  // switch turn
  const next = current === "B" ? "W" : "B";
  if (validMoves(next).length === 0) {
    if (validMoves(current).length === 0) {
      running = false; // end
    }
    // opponent must pass
  } else {
    current = next;
    if (current === "W") {
      setTimeout(aiMove, 300); // AI plays after 300ms
    }
  }

  render();
}

function aiMove() {
  if (!running) return;

  const moves = validMoves("W");
  if (!moves.length) {
    current = "B";
    render();
    return;
  }

  // AI strategy: pick the move that flips the most pieces
  let bestMove = moves[0];
  let maxFlips = flips(bestMove, "W").length;
  moves.forEach(m => {
    const f = flips(m, "W").length;
    if (f > maxFlips) {
      maxFlips = f;
      bestMove = m;
    }
  });

  play(bestMove);
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
    } else if (running && current === "B") {
      btn.addEventListener("click", () => play(i));
    } else {
      btn.disabled = true;
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

  const moves = validMoves(current);
  if (moves.length === 0) {
    statusEl.textContent = `${current === "B" ? "Black" : "White"} passes`;
  } else {
    statusEl.textContent = `${current === "B" ? "Black" : "White"}'s turn`;
  }
}

restartBtn.addEventListener("click", init);

init();

