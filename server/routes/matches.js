const express = require("express");
const { loadMatches } = require("../matches");
const { resultsMap } = require("../services/match-results");
const { getSyncState } = require("../services/live-sync");

const router = express.Router();
const { byId } = loadMatches();

router.get("/live", async (req, res) => {
  const results = await resultsMap();
  res.json({ results, sync: getSyncState() });
});

router.get("/:matchId/live", async (req, res) => {
  const { matchId } = req.params;
  if (!byId[matchId]) {
    return res.status(404).json({ error: "Partido no encontrado." });
  }
  const results = await resultsMap();
  res.json({
    matchId,
    result: results[matchId] || null,
    sync: getSyncState(),
  });
});

module.exports = router;
