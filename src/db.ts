import Database from 'better-sqlite3';
import path from 'path';

// Kết nối database SQLite (lưu vào file game.db)
const db = new Database(path.join(process.cwd(), 'game.db'));

// Tạo bảng players
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
  )
`);

// Tạo bảng scores
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    score INTEGER NOT NULL,
    survival_time INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id)
  )
`);

export default db;
