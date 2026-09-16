const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
// const restartBtn = document.getElementById('restart');

const socket = io(window.location.origin); // connect to your server
let room = null;
let mySymbol = null;
let currentTurn = null;

socket.emit("ttt_find_match");

socket.on("ttt_wait", () => {
  document.getElementById("status").textContent = "Waiting for opponent...";
});

socket.on("ttt_start", data => {
  room = data.room;
  mySymbol = (data.X === socket.id ? "X" : "O");

  // updateBoard(data.board);
  board = [...data.board];
  currentTurn = data.current;

  document.getElementById("status").textContent =
    (data.current === mySymbol ? "Your turn" : "Opponent's turn");
  render();
});

socket.on("ttt_update", data => {
  // updateBoard(data.board);
  board = [...data.board];
  currentTurn = data.current;
  document.getElementById("status").textContent =
    (data.current === mySymbol ? "Your turn" : "Opponent's turn");
  render();
});

socket.on("ttt_game_over", ({ board, winner }) => {
  // updateBoard(board);
  board = [...board];
  currentTurn = null;
  document.getElementById("status").textContent =
    winner === "Draw"
      ? "Draw!"
      : (winner === mySymbol ? "You win!" : "You lose!");
  render();
});

socket.on("ttt_opponent_left", ({ winner }) => {
  document.getElementById("status").textContent =
    (winner === mySymbol ? "Opponent left — You win!" : "Opponent left.");
});

// Game logics
let board = Array(9).fill(null);
// Local game play logic - depracated for online game
// let turn = 'X';
// let running = true;

const lines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// function updateBoard(serverBoard) {
//   board = serverBoard;   // sync
//   render();
// }

function render() {
  boardEl.innerHTML = '';
  board.forEach((cell, idx) => {
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.textContent = cell || '';
    btn.disabled = !!cell;
    btn.addEventListener("click", () => {
      socket.emit("ttt_play", { room, index: idx });
    });
    boardEl.appendChild(btn);
  });
  // Local game play logic - depracated for online game
  // if (!running) {
  //   const winner = checkWinner();
  //   statusEl.textContent = winner ? `Winner: ${winner}` : 'Draw';
  // } else {
  //   statusEl.textContent = `Player ${turn}'s turn`;
  // }
}

// =====================
// Local game play logic - depracated for online game
// =====================
// function play(i) {
//   if (!running || board[i]) return;
//   board[i] = turn;
//   if (checkWinner()) {
//     running = false;
//   } else if (!board.includes(null)) {
//     running = false; // draw
//   } else {
//     turn = turn === 'X' ? 'O' : 'X';
//   }
//   render();
// }
// 
// function checkWinner() {
//   for (const [a,b,c] of lines) {
//     if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
//   }
//   return null;
// }
// 
// restartBtn.addEventListener('click', () => {
//   board = Array(9).fill(null);
//   turn = 'X';
//   running = true;
//   render();
// });

render();

