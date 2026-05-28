const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { loadMatches } = require("../matches");
const { computeLeaderboard, scoreSingle } = require("../utils/scoring");

const router = express.Router();
const { matches, byId, ids: matchIds } = loadMatches();

const allPredictions = db.prepare(`
  SELECT p.user_id, p.match_id, p.home_score, p.away_score, p.updated_at,
         u.display_name, u.email
  FROM predictions p
  JOIN users u ON u.id = p.user_id
  ORDER BY p.match_id, u.display_name
`);
const allResults = db.prepare(
  "SELECT match_id, home_score, away_score, updated_at FROM match_results"
);
const upsertResult = db.prepare(`
  INSERT INTO match_results (match_id, home_score, away_score, updated_at, updated_by)
  VALUES (?, ?, ?, datetime('now'), ?)
  ON CONFLICT(match_id) DO UPDATE SET
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    updated_at = datetime('now'),
    updated_by = excluded.updated_by
`);
const allUsers = db.prepare("SELECT id, display_name, email, is_admin FROM users");

router.use(requireAdmin);

function resultsMap() {
  const map = {};
  for (const row of allResults.all()) {
    map[row.match_id] = {
      homeScore: row.home_score,
      awayScore: row.away_score,
      updatedAt: row.updated_at,
    };
  }
  return map;
}

router.get("/dashboard", (req, res) => {
  const predictions = allPredictions.all();
  const results = resultsMap();
  const users = allUsers.all();
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));

  const leaderboard = computeLeaderboard(predictions, results, usersById);

  res.json({
    stats: {
      users: users.filter((u) => !u.is_admin).length,
      predictions: predictions.length,
      matchesWithResult: Object.keys(results).length,
      totalMatches: matches.length,
    },
    leaderboard,
    results,
  });
});

router.get("/predictions", (req, res) => {
  const results = resultsMap();
  const rows = allPredictions.all();

  const list = rows.map((row) => {
    const match = byId[row.match_id];
    const result = results[row.match_id];
    let points = null;
    let scoreType = null;
    if (result) {
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

router.get("/results", (req, res) => {
  res.json({ results: resultsMap(), matches });
});

router.put("/results/:matchId", (req, res) => {
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

  upsertResult.run(matchId, homeScore, awayScore, req.userId);
  res.json({ result: { matchId, homeScore, awayScore } });
});

router.delete("/results/:matchId", (req, res) => {
  const { matchId } = req.params;
  db.prepare("DELETE FROM match_results WHERE match_id = ?").run(matchId);
  res.status(204).end();
});

router.get("/leaderboard", (req, res) => {
  const predictions = allPredictions.all();
  const results = resultsMap();
  const usersById = Object.fromEntries(allUsers.all().map((u) => [u.id, u]));
  const leaderboard = computeLeaderboard(predictions, results, usersById);
  res.json({ leaderboard, resultsCount: Object.keys(results).length });
});

module.exports = router;
