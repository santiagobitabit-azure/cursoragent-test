const express = require("express");
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { loadMatches } = require("../matches");
const { computeLeaderboard, scoreSingle } = require("../utils/scoring");
const { resultsMap } = require("../services/match-results");
const { syncAllResultsFromApi } = require("../services/live-sync");
const logger = require("../logger");

const router = express.Router();
const log = logger.child({ component: "admin" });
const { matches, byId } = loadMatches();

router.use(requireAdmin);

router.use((req, res, next) => {
  log.debug(
    { adminUserId: req.userId, method: req.method, path: req.path },
    "admin request"
  );
  next();
});

router.get("/dashboard", async (req, res) => {
  const { rows: predictions } = await pool.query(`
    SELECT p.user_id, p.match_id, p.home_score, p.away_score, p.updated_at,
           u.display_name, u.email
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.match_id, u.display_name
  `);
  const results = await resultsMap();
  const { rows: users } = await pool.query(
    "SELECT id, display_name, email, is_admin FROM users"
  );
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  const finishedResults = {};
  for (const [matchId, result] of Object.entries(results)) {
    if (result.status === "finished") finishedResults[matchId] = result;
  }

  const leaderboard = computeLeaderboard(predictions, finishedResults, usersById);

  res.json({
    stats: {
      users: users.filter((u) => !u.is_admin).length,
      predictions: predictions.length,
      matchesWithResult: Object.values(results).filter((r) => r.status === "finished").length,
      totalMatches: matches.length,
    },
    leaderboard,
    results,
  });
});

router.get("/predictions", async (req, res) => {
  const results = await resultsMap();
  const { rows } = await pool.query(`
    SELECT p.user_id, p.match_id, p.home_score, p.away_score, p.updated_at,
           u.display_name, u.email
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.match_id, u.display_name
  `);

  const list = rows.map((row) => {
    const match = byId[row.match_id];
    const result = results[row.match_id];
    let points = null;
    let scoreType = null;
    if (result?.status === "finished") {
      const scored = scoreSingle(
        row.home_score,
        row.away_score,
        result.homeScore,
        result.awayScore
      );
      points = scored.points;
      scoreType = scored.type;
    }

    return {
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      matchId: row.match_id,
      group: match?.group,
      home: match?.home,
      away: match?.away,
      matchday: match?.matchday,
      prediction: { homeScore: row.home_score, awayScore: row.away_score },
      result: result || null,
      points,
      scoreType,
      updatedAt: row.updated_at,
    };
  });

  res.json({ predictions: list, results });
});

router.get("/results", async (req, res) => {
  res.json({ results: await resultsMap(), matches });
});

router.post("/sync-results", async (req, res) => {
  try {
    const result = await syncAllResultsFromApi();
    log.info({ adminUserId: req.userId, ...result }, "manual results sync");
    res.json(result);
  } catch (err) {
    log.warn({ adminUserId: req.userId, err }, "manual results sync failed");
    res.status(502).json({ error: err.message || "No se pudo sincronizar con la API." });
  }
});

router.get("/leaderboard", async (req, res) => {
  const { rows: predictions } = await pool.query(`
    SELECT p.user_id, p.match_id, p.home_score, p.away_score, p.updated_at,
           u.display_name, u.email
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.match_id, u.display_name
  `);
  const results = await resultsMap();
  const finishedResults = {};
  for (const [matchId, result] of Object.entries(results)) {
    if (result.status === "finished") finishedResults[matchId] = result;
  }
  const { rows: users } = await pool.query(
    "SELECT id, display_name, email, is_admin FROM users"
  );
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const leaderboard = computeLeaderboard(predictions, finishedResults, usersById);
  res.json({
    leaderboard,
    resultsCount: Object.keys(finishedResults).length,
  });
});

module.exports = router;
