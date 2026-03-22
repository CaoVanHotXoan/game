import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import db from "./src/db.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Lấy bảng xếp hạng Top 10
  app.get("/api/leaderboard", (req, res) => {
    try {
      const stmt = db.prepare(`
        SELECT p.username, s.score, s.survival_time, s.created_at
        FROM scores s
        JOIN players p ON s.player_id = p.id
        ORDER BY s.score DESC
        LIMIT 10
      `);
      const topScores = stmt.all();
      res.json(topScores);
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // API: Lưu điểm người chơi
  app.post("/api/save-score", (req, res) => {
    const { username, score, survivalTime } = req.body;
    
    if (!username || typeof score !== 'number' || typeof survivalTime !== 'number') {
      return res.status(400).json({ error: "Invalid data" });
    }

    try {
      // Tìm hoặc tạo player
      let player = db.prepare('SELECT id FROM players WHERE username = ?').get(username) as { id: number } | undefined;
      
      if (!player) {
        const insertPlayer = db.prepare('INSERT INTO players (username) VALUES (?)').run(username);
        player = { id: Number(insertPlayer.lastInsertRowid) };
      }

      // Lưu điểm
      db.prepare('INSERT INTO scores (player_id, score, survival_time) VALUES (?, ?, ?)')
        .run(player.id, score, survivalTime);

      res.json({ success: true });
    } catch (error) {
      console.error("Save score error:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
