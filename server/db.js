const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "mundial.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS predictions (
    user_id INTEGER NOT NULL,
    match_id TEXT NOT NULL,
    home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
    away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, match_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS match_results (
    match_id TEXT PRIMARY KEY,
    home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
    away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by INTEGER REFERENCES users(id)
  );
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`);
} catch {
  /* columna ya existe */
}

module.exports = db;
