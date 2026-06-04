const logger = require("../logger");
const { pool } = require("../db");

const log = logger.child({ component: "match-results" });

function rowToResult(row) {
  if (!row) return null;
  return {
    homeScore: row.home_score,
    awayScore: row.away_score,
    updatedAt: row.updated_at,
    source: row.source || "api",
    locked: row.locked ?? false,
    status: row.status || "scheduled",
    timeElapsed: row.time_elapsed,
    syncedAt: row.synced_at,
  };
}

async function getResult(matchId) {
  const { rows } = await pool.query(
    `SELECT match_id, home_score, away_score, updated_at, source, locked, status, time_elapsed, synced_at
     FROM match_results WHERE match_id = $1`,
    [matchId]
  );
  return rowToResult(rows[0]);
}

async function resultsMap() {
  const { rows } = await pool.query(
    `SELECT match_id, home_score, away_score, updated_at, source, locked, status, time_elapsed, synced_at
     FROM match_results`
  );
  const map = {};
  for (const row of rows) {
    map[row.match_id] = rowToResult(row);
  }
  return map;
}

function resultChanged(existing, parsed) {
  if (!existing) return true;
  return (
    existing.homeScore !== parsed.homeScore ||
    existing.awayScore !== parsed.awayScore ||
    existing.status !== parsed.status ||
    existing.timeElapsed !== parsed.timeElapsed
  );
}

async function upsertFromApi(parsed) {
  const existing = await getResult(parsed.matchId);
  const changed = resultChanged(existing, parsed);

  await pool.query(
    `INSERT INTO match_results (match_id, home_score, away_score, updated_at, source, locked, status, time_elapsed, synced_at)
     VALUES ($1, $2, $3, NOW(), 'api', FALSE, $4, $5, NOW())
     ON CONFLICT (match_id) DO UPDATE SET
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       updated_at = NOW(),
       source = 'api',
       locked = FALSE,
       status = EXCLUDED.status,
       time_elapsed = EXCLUDED.time_elapsed,
       synced_at = NOW()`,
    [parsed.matchId, parsed.homeScore, parsed.awayScore, parsed.status, parsed.timeElapsed]
  );

  const fields = {
    matchId: parsed.matchId,
    status: parsed.status,
    homeScore: parsed.homeScore,
    awayScore: parsed.awayScore,
    changed,
  };

  if (changed) {
    log.info(fields, "result persisted");
  } else {
    log.debug(fields, "result unchanged");
  }
}

module.exports = {
  rowToResult,
  getResult,
  resultsMap,
  upsertFromApi,
};
