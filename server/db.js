require("./env");
const { Pool } = require("pg");

function poolSsl() {
  if (process.env.PGSSLMODE === "disable") return false;
  const url = process.env.DATABASE_URL || "postgresql://mundial:mundial@localhost:5432/mundial";
  if (/sslmode=disable/i.test(url)) return false;
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://mundial:mundial@localhost:5432/mundial",
  ssl: poolSsl(),
});

let initialized = false;

async function init() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS predictions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL,
      home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
      away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS match_results (
      match_id TEXT PRIMARY KEY,
      home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
      away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by INTEGER REFERENCES users(id)
    );
  `);

  initialized = true;
}

module.exports = { pool, init };
