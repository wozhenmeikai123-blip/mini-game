const cors = require("cors");
const bcrypt = require("bcrypt");
const express = require('express');
const { Pool } = require("pg");
const path = require('path');
const app = express();
const client = require("prom-client");

// For online matches
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, { cors: { origin: "*" } });

// Create a Registry to register custom metrics
const register = new client.Registry();
// Default metrics (node process metrics)
client.collectDefaultMetrics({ register });
// --- Custom Metric: registered user Counter ---
const registeredUserCounter = new client.Counter({
  name: "users_registered_total",
  help: "Total number of users registered",
  labelNames: ["method", "route", "status"],
});
const usersLoggedIn = new client.Counter({
  name: "users_logged_in_total",
  help: "Total number of successful user logins",
  labelNames: ["method", "route", "status"],
});
// Register
register.registerMetric(registeredUserCounter);
register.registerMetric(usersLoggedIn);

const PORT = process.env.PORT || 8080; // fallback to 8080
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// GET / : Root page. Redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// POST /register: Register a new user
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Invalid username or password." });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Username already taken." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id, username, created_at",
      [username, hashedPassword]
    );

    // Increment httpRequestCounter
    registeredUserCounter.inc({
      method: req.method,
      route: "/register",
      status: 201,
    });

    console.log(`User (${username}) registered !`);
    
    const newUser = result.rows[0];
    res.status(201).json({ 
      message: "User registered successfully", 
      user: newUser
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error: register" });
  }
});

// POST /login: Login a user. Query database to check the credentials. 
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    // Check if user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = userResult.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // Optionally update last_login
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [user.user_id]
    );

    // Increment usersLoggedIn Counter
    usersLoggedIn.inc({
      method: req.method,
      route: "/login",
      status: 201,
    });

    console.log(`User (${username}) logged in !`);

    // Respond with user info (without password)
    res.status(200).json({
      message: "Login successful",
      user: { user_id: user.user_id, username: user.username },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error: login" });
  }
});

// POST /api/klotski/save: Save the players current Klotski game state
app.post("/api/klotski/save", async (req, res) => {
  const { user_id, board, current_steps } = req.body;

  // Check if input valid
  if (!user_id) return res.status(400).json({ error: "user_id required"});
  if (!board) return res.status(400).json({ error: "board required"});
  if (typeof current_steps !== "number") return res.status(400).json({ error: "steps must be a number"});

  try{
    // Insert or update the saved game
    const result = await pool.query(
      `
      INSERT INTO klotski_game (user_id, board, current_steps)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        board = EXCLUDED.board,
        current_steps = EXCLUDED.current_steps,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
      `,
      [user_id, board, current_steps]
    );

    // Return success and saved game data
    res.status(200).json({
      ok: true,
      game: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Klotski save error" });
  }
});

// POST /api/klotski/load: Load saved klotski game state given username
app.post("/api/klotski/load", async (req, res) => {
  const { username } = req.body;
  // Check if input valid
  if (!username) return res.status(400).json({ error: "username required"});
  
  try{
    // Find user_id from username
    const user = await pool.query(
      "SELECT user_id FROM users WHERE username = $1",
      [username]
    );

    // If user does not exist in DB
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const user_id = user.rows[0].user_id;
    // Load saved game
    const savedResult = await pool.query(
      "SELECT board, current_steps FROM klotski_game WHERE user_id = $1",
      [user_id]
    );
    // User exists but no saved data
    if (savedResult.rows.length === 0) return res.json({ exists: false, user_id});

    // User exists and have saved data, return data
    const save = savedResult.rows[0];
    return res.json({
      exists: true,
      user_id: user_id,
      board: save.board,
      current_steps: save.current_steps
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Klotski save error" });
  }
});

// GET /api/klotski/leaderboard: Retrieve top 10 user from leaderboard
app.get("/api/klotski/leaderboard", async (req, res) =>{
  try{
    const result = await pool.query(
      `
      SELECT 
        u.username,
        l.best_steps,
        l.created_at
      FROM klotski_leaderboard l
      JOIN users u ON u.user_id = l.user_id
      ORDER BY l.best_steps ASC
      LIMIT 10;
      `
    );
    res.json(result.rows);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Leaderboard error" });
  }
});

// POST /api/klotski/leaderboard/save: Update leaderboard with new best score
app.post("/api/klotski/leaderboard/save", async (req, res) => {
  const { user_id, best_steps } = req.body;
  // Check if input valid
  if (!user_id || typeof best_steps !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    // Insert new record with better best_steps
    const result = await pool.query(
      `INSERT INTO klotski_leaderboard (user_id, best_steps)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         best_steps = LEAST(klotski_leaderboard.best_steps, EXCLUDED.best_steps),
         created_at = CASE 
             WHEN EXCLUDED.best_steps < klotski_leaderboard.best_steps 
             THEN CURRENT_TIMESTAMP 
             ELSE klotski_leaderboard.created_at 
         END
       RETURNING *;`,
      [user_id, best_steps]
    );

    // return updated leaderboard
    res.json({
      updated: true,
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: "Leaderboard save error"})
  }
});

// simple health route
app.get('/health', (req, res) => res.send('ok'));

// Expose metrics to Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});


// ==============================
//   REVERSI MATCHMAKING SYSTEM
// ==============================
let waitingPlayer = null;

function createInitialBoard() {
  const board = Array(64).fill(null);
  board[27] = "W";
  board[28] = "B";
  board[35] = "B";
  board[36] = "W";
  return board;
}

function computeFlips(board, i, player) {
  const dirs = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],        [0,1],
    [1,-1],[1,0],[1,1]
  ];
  const opp = player === "B" ? "W" : "B";
  const r = Math.floor(i / 8);
  const c = i % 8;
  const result = [];

  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    const line = [];

    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 &&
           board[rr*8 + cc] === opp) {
      line.push(rr*8 + cc);
      rr += dr; cc += dc;
    }

    if (line.length &&
        rr >= 0 && rr < 8 && cc >= 0 && cc < 8 &&
        board[rr*8 + cc] === player) {
      result.push(...line);
    }
  }

  return result;
}

// roomId -> game state
const games = {};

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  // ========== Matchmaking ==========
  if (!waitingPlayer) {
    waitingPlayer = socket;
    socket.emit("match_wait");
    return;
  }

  // Pair two players
  const p1 = waitingPlayer;
  const p2 = socket;
  waitingPlayer = null;

  const room = `room_${p1.id}_${p2.id}`;
  p1.join(room);
  p2.join(room);

  games[room] = {
    board: createInitialBoard(),
    current: "B",        // Black starts
    players: { B: p1.id, W: p2.id }
  };

  io.to(room).emit("match_start", {
    room,
    board: games[room].board,
    black: p1.id,
    white: p2.id,
    current: "B"
  });

  // ========== Handle moves ==========
  function handleMove(playerSocket, index) {
    const game = games[room];
    if (!game) return;

    const color = game.players.B === playerSocket.id ? "B" : "W";
    if (color !== game.current) return; // Not your turn

    const board = game.board;
    if (board[index]) return; // Occupied

    const f = computeFlips(board, index, color);
    if (f.length === 0) return; // illegal move

    // Apply move
    board[index] = color;
    f.forEach(i => board[i] = color);

    // Check next valid moves
    const nextColor = color === "B" ? "W" : "B";

    if (validMoves(board, nextColor).length === 0) {
      if (validMoves(board, color).length === 0 || board.every(cell => cell)) {
        // Game over
        const bCount = board.filter(x => x === "B").length;
        const wCount = board.filter(x => x === "W").length;
        const winner = bCount === wCount ? "Draw" : (bCount > wCount ? "B" : "W");

        io.to(room).emit("game_over", { board, winner });
        delete games[room];
        return;
      } else {
        // Opponent must pass
        game.current = color; // same player plays again
      }
    } else {
      game.current = nextColor;
    }

    io.to(room).emit("board_update", {
      board: board,
      current: game.current
    });
  }

  function validMoves(board, player) {
    const moves = [];
    for (let i = 0; i < board.length; i++) {
      if (!board[i] && computeFlips(board, i, player).length) {
        moves.push(i);
      }
    }
    return moves;
  }

  p1.on("play_move", i => handleMove(p1, i));
  p2.on("play_move", i => handleMove(p2, i));

  // ========== Handle disconnect ==========
  const onDC = (playerSocket) => {
    if (!games[room]) return;

    const winner = (games[room].players.B === playerSocket.id)
      ? "W"
      : "B";

    io.to(room).emit("opponent_left", { winner });
    delete games[room];
  };

  p1.on("disconnect", () => onDC(p1));
  p2.on("disconnect", () => onDC(p2));
});
// =================================
// END OF REVERSI MATCHMAKING SYSTEM
// =================================

// ==============================
//  TICTACTOE MATCHMAKING SYSTEM
// ==============================
let waitingTTT = null;
const tttGames = {}; // roomId → game data

io.on("connection", socket => {

  // --- Matchmaking ---
  socket.on("ttt_find_match", () => {
    if (!waitingTTT) {
      waitingTTT = socket;
      socket.emit("ttt_wait");
      return;
    }

    const p1 = waitingTTT;
    const p2 = socket;
    waitingTTT = null;

    const room = `ttt_${p1.id}_${p2.id}`;
    p1.join(room);
    p2.join(room);

    tttGames[room] = {
      board: Array(9).fill(null),
      current: "X",
      players: { X: p1.id, O: p2.id },
    };

    io.to(room).emit("ttt_start", {
      room,
      board: tttGames[room].board,
      current: "X",
      X: p1.id,
      O: p2.id,
    });
  });

  // --- Moves ---
  socket.on("ttt_play", ({ room, index }) => {
    const game = tttGames[room];
    if (!game) return;

    const board = game.board;
    if (board[index]) return; // taken

    const player = game.players[game.current];
    if (socket.id !== player) return; // not your turn

    board[index] = game.current;

    // Check win/ draw
    const wins = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    const won = wins.some(w => 
      board[w[0]] && 
      board[w[0]] === board[w[1]] && 
      board[w[1]] === board[w[2]]
    );

    if (won) {
      io.to(room).emit("ttt_update", { board, current: game.current });
      io.to(room).emit("ttt_game_over", { board, winner: game.current });
      delete tttGames[room];
      return;
    }

    if (board.every(x => x)) {
      io.to(room).emit("ttt_update", { board, current: game.current });
      io.to(room).emit("ttt_game_over", { board, winner: "Draw" });
      delete tttGames[room];
      return;
    }

    game.current = (game.current === "X" ? "O" : "X");
    io.to(room).emit("ttt_update", { board, current: game.current });

  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    for (const room in tttGames) {
      const g = tttGames[room];
      if (!g) continue;

      if (g.players.X === socket.id || g.players.O === socket.id) {
        const winner = g.players.X === socket.id ? "O" : "X";
        io.to(room).emit("ttt_opponent_left", { winner });
        delete tttGames[room];
      }
    }
  });
});
// ===================================
// END OF TICTACTOE MATCHMAKING SYSTEM
// ===================================

// Return 404 for all other requests
app.use((req, res) => {
  res.status(404).send('Page not found');
});

http.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

