function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLeaderboardTable(leaderboard) {
  if (!leaderboard.length) {
    return `
      <p class="leaderboard-empty">
        Todavía no hay puntos. El ranking se actualiza cuando finalizan los partidos.
      </p>
      <p class="admin-hint">Puntos: <strong>3</strong> resultado exacto · <strong>1</strong> acierto de ganador o empate</p>`;
  }

  const rows = leaderboard
    .map(
      (u, i) => `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td><strong>${escapeHtml(u.displayName)}</strong></td>
      <td class="num">${u.totalPoints}</td>
      <td class="num">${u.exactHits}</td>
      <td class="num">${u.outcomeHits}</td>
      <td class="num">${u.scoredMatches}</td>
    </tr>`
    )
    .join("");

  return `
    <p class="admin-hint">Puntos: <strong>3</strong> resultado exacto · <strong>1</strong> acierto de ganador o empate</p>
    <div class="admin-table-wrap">
      <table class="admin-table leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Usuario</th>
            <th>Puntos</th>
            <th>Exactos</th>
            <th>Resultado</th>
            <th>Partidos puntuados</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadLeaderboard() {
  const root = document.getElementById("leaderboard-content");
  if (!root) return;

  try {
    const data = await AuthAPI.getLeaderboard();
    root.innerHTML = renderLeaderboardTable(data.leaderboard || []);
  } catch (err) {
    root.innerHTML = `<p class="leaderboard-empty">${escapeHtml(err.message)}</p>`;
  }
}

async function onLeaderboardPanelOpen() {
  const root = document.getElementById("leaderboard-content");
  if (!root) return;
  root.innerHTML = '<p class="admin-loading">Cargando ranking…</p>';
  await loadLeaderboard();
}

function initLeaderboard() {
  window.addEventListener("match:finished", () => {
    const panel = document.getElementById("panel-leaderboard");
    if (panel && !panel.hidden) loadLeaderboard();
  });

  window.addEventListener("results:synced", () => {
    const panel = document.getElementById("panel-leaderboard");
    if (panel && !panel.hidden) loadLeaderboard();
  });

  window.addEventListener("panel:open", (e) => {
    if (e.detail?.panel === "leaderboard") onLeaderboardPanelOpen();
  });
}

initLeaderboard();
