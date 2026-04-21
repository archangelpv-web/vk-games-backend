const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- init tables ---
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      image TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      game_id INTEGER,
      phone TEXT,
      participants INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
initDB();

// --- API ---

app.get("/games", async (req, res) => {
  const result = await pool.query("SELECT * FROM games ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/games", async (req, res) => {
  const { title, description, image } = req.body;
  const result = await pool.query(
    "INSERT INTO games (title, description, image) VALUES ($1,$2,$3) RETURNING *",
    [title, description, image]
  );
  res.json(result.rows[0]);
});

app.post("/register", async (req, res) => {
  const { game_id, phone, participants } = req.body;

  await pool.query(
    "INSERT INTO registrations (game_id, phone, participants) VALUES ($1,$2,$3)",
    [game_id, phone, participants]
  );

  const game = await pool.query(
    "SELECT * FROM games WHERE id=$1",
    [game_id]
  );

  res.json({
    success: true,
    game: game.rows[0]
  });
});

app.get("/registrations", async (req, res) => {
  const result = await pool.query(`
    SELECT r.*, g.title 
    FROM registrations r
    JOIN games g ON g.id = r.game_id
    ORDER BY r.created_at DESC
  `);
  res.json(result.rows);
});

app.listen(3000, () => console.log("Server started"));
