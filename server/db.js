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

  await pool.query(`
    ALTER TABLE match_results ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'api';
    ALTER TABLE match_results ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE match_results ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
    ALTER TABLE match_results ADD COLUMN IF NOT EXISTS time_elapsed TEXT;
    ALTER TABLE match_results ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
  `);

  await pool.query(`
    UPDATE match_results
    SET locked = FALSE, source = 'api'
    WHERE locked = TRUE OR source = 'admin'
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_oid TEXT;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_microsoft_oid_key
    ON users (microsoft_oid)
    WHERE microsoft_oid IS NOT NULL
  `);

  initialized = true;
}

module.exports = { pool, init };
