const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { loadMatches } = require("../matches");
const { getResult } = require("../services/match-results");
const { canPredict } = require("../utils/predictions-open");

const router = express.Router();
const { ids: matchIds, byId } = loadMatches();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT match_id, home_score, away_score, updated_at FROM predictions WHERE user_id = $1",
    [req.userId]
  );
  const predictions = {};
  for (const row of rows) {
    predictions[row.match_id] = {
      homeScore: row.home_score,
      awayScore: row.away_score,
      updatedAt: row.updated_at,
    };
  }
  res.json({ predictions });
});

router.put("/:matchId", async (req, res) => {
  const { matchId } = req.params;
  if (!matchIds.has(matchId)) {
    return res.status(400).json({ error: "Partido no válido." });
  }

  const match = byId[matchId];
  const existingResult = await getResult(matchId);
  const open = canPredict(match, existingResult);
  if (!open.ok) {
    return res.status(403).json({ error: open.reason });
  }

  const homeScore = Number(req.body?.homeScore);
  const awayScore = Number(req.body?.awayScore);

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 99 ||
    awayScore > 99
  ) {
    return res.status(400).json({ error: "Ingresá goles válidos (0–99)." });
  }

  await pool.query(
    `INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, match_id) DO UPDATE SET
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       updated_at = NOW()`,
    [req.userId, matchId, homeScore, awayScore]
  );
  res.json({ prediction: { matchId, homeScore, awayScore } });
});

router.delete("/:matchId", async (req, res) => {
  const { matchId } = req.params;
  if (!matchIds.has(matchId)) {
    return res.status(400).json({ error: "Partido no válido." });
  }

  const match = byId[matchId];
  const existingResult = await getResult(matchId);
  const open = canPredict(match, existingResult);
  if (!open.ok) {
    return res.status(403).json({ error: open.reason });
  }

  await pool.query("DELETE FROM predictions WHERE user_id = $1 AND match_id = $2", [
    req.userId,
    matchId,
  ]);
  res.status(204).end();
});

module.exports = router;
