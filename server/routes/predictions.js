const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { loadMatches } = require("../matches");

const router = express.Router();
const { ids: matchIds } = loadMatches();

const listByUser = db.prepare(
  "SELECT match_id, home_score, away_score, updated_at FROM predictions WHERE user_id = ?"
);
const upsert = db.prepare(`
  INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, match_id) DO UPDATE SET
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    updated_at = datetime('now')
`);
const removeOne = db.prepare(
  "DELETE FROM predictions WHERE user_id = ? AND match_id = ?"
);

router.use(requireAuth);

router.get("/", (req, res) => {
  const rows = listByUser.all(req.userId);
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

router.put("/:matchId", (req, res) => {
  const { matchId } = req.params;
  if (!matchIds.has(matchId)) {
    return res.status(400).json({ error: "Partido no válido." });
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

  upsert.run(req.userId, matchId, homeScore, awayScore);
  res.json({ prediction: { matchId, homeScore, awayScore } });
});

router.delete("/:matchId", (req, res) => {
  const { matchId } = req.params;
  if (!matchIds.has(matchId)) {
    return res.status(400).json({ error: "Partido no válido." });
  }
  removeOne.run(req.userId, matchId);
  res.status(204).end();
});

module.exports = router;
