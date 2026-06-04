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

function renderScoreBadge(type, points) {
  if (points === null) return '<span class="badge badge--muted">Sin resultado</span>';
  if (type === "exact") return `<span class="badge badge--gold">+${points} exacto</span>`;
  if (type === "outcome") return `<span class="badge badge--ok">+${points} resultado</span>`;
  return '<span class="badge badge--miss">0 pts</span>';
}
