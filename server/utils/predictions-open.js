const CLOSE_BEFORE_MS = 5 * 60 * 1000;

function canPredict(match, result) {
  if (result?.status === "live" || result?.status === "finished") {
    return { ok: false, reason: "El partido ya empezó o finalizó." };
  }

  const kickoff = new Date(match.kickoff).getTime();
  if (Date.now() >= kickoff - CLOSE_BEFORE_MS) {
    return { ok: false, reason: "Los pronósticos cierran 5 minutos antes del pitido inicial." };
  }

  return { ok: true };
}

module.exports = { canPredict, CLOSE_BEFORE_MS };
