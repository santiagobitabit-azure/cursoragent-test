/** Puntos: 3 exacto, 1 acierto de resultado (ganador o empate). */
function scorePrediction(predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) {
    return { points: 3, type: "exact" };
  }
  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);
  if (predSign === realSign) {
    return { points: 1, type: "outcome" };
  }
  return { points: 0, type: "miss" };
}

function computeLeaderboard(predictions, results, usersById) {
  const stats = {};

  for (const pred of predictions) {
    const result = results[pred.match_id];
    if (!result) continue;

    const realHome = result.home_score ?? result.homeScore;
    const realAway = result.away_score ?? result.awayScore;

    if (!stats[pred.user_id]) {
      const user = usersById[pred.user_id];
      stats[pred.user_id] = {
        userId: pred.user_id,
        displayName: user?.display_name || "Usuario",
        email: user?.email || "",
        totalPoints: 0,
        exactHits: 0,
        outcomeHits: 0,
        scoredMatches: 0,
        predictionsCount: 0,
      };
    }

    const s = stats[pred.user_id];
    s.predictionsCount += 1;
    const { points, type } = scorePrediction(
      pred.home_score,
      pred.away_score,
      realHome,
      realAway
    );
    s.totalPoints += points;
    s.scoredMatches += 1;
    if (type === "exact") s.exactHits += 1;
    if (type === "outcome") s.outcomeHits += 1;
  }

  return Object.values(stats).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    return a.displayName.localeCompare(b.displayName);
  });
}

function scoreSingle(predHome, predAway, realHome, realAway) {
  return scorePrediction(predHome, predAway, realHome, realAway);
}

module.exports = { scorePrediction, computeLeaderboard, scoreSingle };
