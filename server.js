import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- SQLite setup ---
sqlite3.verbose();
const dbFile = path.join(__dirname, "data.db");
const db = new sqlite3.Database(dbFile);

// initialize tables if not exist
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board TEXT NOT NULL,
      name TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '접수됨',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`);
  });
}

if (process.argv.includes("--init-db")) {
  initDB();
  console.log("DB initialized.");
  process.exit(0);
}

initDB();

// --- Boards (fixed 3) ---
const BOARDS = [
  { slug: "computer-quote", name: "컴퓨터 견적 문의" },
  { slug: "code-consult", name: "코드 의뢰 상담" },
  { slug: "ppt-request", name: "PPT 관련 의뢰" },
];

app.get("/api/boards", (req, res) => {
  res.json(BOARDS);
});

function validBoard(slug) {
  return BOARDS.find(b => b.slug === slug);
}

// --- Posts ---
app.get("/api/:board/posts", (req, res) => {
  const { board } = req.params;
  if (!validBoard(board)) return res.status(404).json({ error: "존재하지 않는 보드" });
  const q = `SELECT * FROM posts WHERE board = ? ORDER BY created_at DESC`;
  db.all(q, [board], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // fetch replies for each post
    const ids = rows.map(r => r.id);
    if (ids.length === 0) return res.json([]);
    const placeholders = ids.map(_ => "?").join(",");
    db.all(`SELECT * FROM replies WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`, ids, (err2, reps) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const grouped = reps.reduce((acc, r) => {
        acc[r.post_id] = acc[r.post_id] || [];
        acc[r.post_id].push(r);
        return acc;
      }, {});
      const merged = rows.map(r => ({ ...r, replies: grouped[r.id] || [] }));
      res.json(merged);
    });
  });
});

app.post("/api/:board/posts", (req, res) => {
  const { board } = req.params;
  if (!validBoard(board)) return res.status(404).json({ error: "존재하지 않는 보드" });
  const { name, title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: "title, content 필수" });
  const stmt = `INSERT INTO posts (board, name, title, content) VALUES (?, ?, ?, ?)`;
  db.run(stmt, [board, name || "", title, content], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
});

// --- Admin: set status ---
app.patch("/api/:board/posts/:id/status", (req, res) => {
  const { board, id } = req.params;
  if (!validBoard(board)) return res.status(404).json({ error: "존재하지 않는 보드" });
  const key = req.get("x-admin-key") || "";
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "관리자 키가 올바르지 않습니다." });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status 필수" });
  const stmt = `UPDATE posts SET status = ? WHERE id = ? AND board = ?`;
  db.run(stmt, [status, id, board], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// --- Admin: reply ---
app.post("/api/:board/posts/:id/replies", (req, res) => {
  const { board, id } = req.params;
  if (!validBoard(board)) return res.status(404).json({ error: "존재하지 않는 보드" });
  const key = req.get("x-admin-key") || "";
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "관리자 키가 올바르지 않습니다." });
  const { content, author } = req.body || {};
  if (!content) return res.status(400).json({ error: "content 필수" });
  const stmt = `INSERT INTO replies (post_id, author, content) VALUES (?, ?, ?)`;
  db.run(stmt, [id, author || "관리자", content], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
});

// Fallback: SPA files
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Boards: ${BOARDS.map(b=>b.slug).join(", ")}`);
});
