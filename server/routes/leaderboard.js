const express = require("express");
const { pool } = require("../db");
const { resultsMap } = require("../services/match-results");
const { computeLeaderboard } = require("../utils/scoring");

const router = express.Router();

router.get("/", async (req, res) => {
  const results = await resultsMap();
  const finishedCount = Object.values(results).filter((r) => r.status === "finished").length;

  const { rows: predictions } = await pool.query(`
    SELECT p.user_id, p.match_id, p.home_score, p.away_score, p.updated_at,
           u.display_name, u.email
    FROM predictions p
    JOIN users u ON u.id = p.user_id
    WHERE u.is_admin = FALSE
    ORDER BY p.match_id, u.display_name
  `);

  const finishedResults = {};
  for (const [matchId, result] of Object.entries(results)) {
    if (result.status === "finished") finishedResults[matchId] = result;
  }

  const { rows: users } = await pool.query(
    "SELECT id, display_name, email, is_admin FROM users WHERE is_admin = FALSE"
  );
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const leaderboard = computeLeaderboard(predictions, finishedResults, usersById);

  res.json({ leaderboard, finishedCount });
});

module.exports = router;
