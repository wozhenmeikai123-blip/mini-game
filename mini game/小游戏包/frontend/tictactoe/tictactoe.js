const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let board = Array(9).fill(null);
let turn = 'X';
let running = true;

const lines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function render() {
  boardEl.innerHTML = '';
  board.forEach((cell, idx) => {
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.textContent = cell || '';
    btn.disabled = !!cell || !running;
    btn.addEventListener('click', () => play(idx));
    boardEl.appendChild(btn);
  });
  if (!running) {
    const winner = checkWinner();
    statusEl.textContent = winner ? `Winner: ${winner}` : 'Draw';
  } else {
    statusEl.textContent = `Player ${turn}'s turn`;
  }
}

function play(i) {
  if (!running || board[i]) return;
  board[i] = turn;
  if (checkWinner()) {
    running = false;
  } else if (!board.includes(null)) {
    running = false; // draw
  } else {
    turn = turn === 'X' ? 'O' : 'X';
  }
  render();
}

function checkWinner() {
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

restartBtn.addEventListener('click', () => {
  board = Array(9).fill(null);
  turn = 'X';
  running = true;
  render();
});

render();
