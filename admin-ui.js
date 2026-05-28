const ADMIN_VIEWS = ["ranking", "predictions", "results"];
let adminView = "ranking";
let adminData = { dashboard: null, predictions: [], results: {}, matches: [] };

function teamName(id) {
  return (typeof TEAM_NAMES_ES !== "undefined" && TEAM_NAMES_ES[id]) || id;
}

function matchLabel(m) {
  if (!m) return "";
  return `Grupo ${m.group} · ${teamName(m.home)} vs ${teamName(m.away)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreBadge(type, points) {
  if (points === null) return '<span class="badge badge--muted">Sin resultado</span>';
  if (type === "exact") return `<span class="badge badge--gold">+${points} exacto</span>`;
  if (type === "outcome") return `<span class="badge badge--ok">+${points} resultado</span>`;
  return `<span class="badge badge--miss">0 pts</span>`;
}

function updateAdminTabVisibility() {
  const tab = document.getElementById("tab-admin");
  if (!tab) return;
  const isAdmin = window.AuthState?.getUser()?.isAdmin;
  tab.hidden = !isAdmin;
}

function renderAdminNav() {
  const nav = document.getElementById("admin-subnav");
  if (!nav) return;
  nav.innerHTML = ADMIN_VIEWS.map(
    (v) => `
    <button type="button" class="admin-subnav__btn${adminView === v ? " admin-subnav__btn--active" : ""}" data-admin-view="${v}">
      ${v === "ranking" ? "Ranking" : v === "predictions" ? "Todos los pronósticos" : "Resultados reales"}
    </button>`
  ).join("");

  nav.querySelectorAll("[data-admin-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      adminView = btn.dataset.adminView;
      renderAdminPanel();
    });
  });
}

function renderRanking() {
  const board = adminData.dashboard?.leaderboard || [];
  const stats = adminData.dashboard?.stats;

  if (!board.length) {
    return `
      <p class="admin-empty">Todavía no hay puntos: cargá resultados reales y asegurate de que los usuarios hayan pronosticado.</p>
      <p class="admin-hint">Puntos: <strong>3</strong> resultado exacto · <strong>1</strong> acierto de ganador o empate</p>`;
  }

  const rows = board
    .map(
      (u, i) => `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td><strong>${escapeHtml(u.displayName)}</strong><br /><span class="muted">${escapeHtml(u.email)}</span></td>
      <td class="num">${u.totalPoints}</td>
      <td class="num">${u.exactHits}</td>
      <td class="num">${u.outcomeHits}</td>
      <td class="num">${u.scoredMatches}</td>
    </tr>`
    )
    .join("");

  return `
    <div class="admin-stats">
      <div class="stat-card"><span class="stat-card__n">${stats?.users ?? 0}</span><span class="stat-card__l">Usuarios</span></div>
      <div class="stat-card"><span class="stat-card__n">${stats?.predictions ?? 0}</span><span class="stat-card__l">Pronósticos</span></div>
      <div class="stat-card"><span class="stat-card__n">${stats?.matchesWithResult ?? 0}/${stats?.totalMatches ?? 72}</span><span class="stat-card__l">Resultados cargados</span></div>
    </div>
    <p class="admin-hint">Puntos: <strong>3</strong> resultado exacto · <strong>1</strong> acierto de ganador o empate</p>
    <div class="admin-table-wrap">
      <table class="admin-table">
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

function renderPredictionsTable() {
  const filter = document.getElementById("admin-pred-filter")?.value || "all";
  let list = adminData.predictions;

  if (filter !== "all") {
    list = list.filter((p) => p.group === filter);
  }

  const search = (document.getElementById("admin-pred-search")?.value || "").toLowerCase();
  if (search) {
    list = list.filter(
      (p) =>
        p.displayName.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        teamName(p.home).toLowerCase().includes(search) ||
        teamName(p.away).toLowerCase().includes(search)
    );
  }

  if (!list.length) {
    return '<p class="admin-empty">No hay pronósticos para mostrar.</p>';
  }

  const rows = list
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.displayName)}</td>
      <td>Grupo ${p.group} · Fecha ${p.matchday}</td>
      <td>${teamName(p.home)} vs ${teamName(p.away)}</td>
      <td class="num">${p.prediction.homeScore} : ${p.prediction.awayScore}</td>
      <td class="num">${p.result ? `${p.result.homeScore} : ${p.result.awayScore}` : "—"}</td>
      <td>${scoreBadge(p.scoreType, p.points)}</td>
    </tr>`
    )
    .join("");

  return `
    <div class="admin-filters">
      <input type="search" id="admin-pred-search" class="admin-input" placeholder="Buscar usuario o equipo…" />
      <select id="admin-pred-filter" class="admin-input">
        <option value="all">Todos los partidos</option>
        ${"ABCDEFGHIJKL".split("")
          .map((g) => `<option value="${g}">Grupo ${g}</option>`)
          .join("")}
      </select>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Grupo</th>
            <th>Partido</th>
            <th>Pronóstico</th>
            <th>Real</th>
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderResultsForm() {
  const matches = adminData.matches.length
    ? adminData.matches
    : typeof GROUP_STAGE_MATCHES !== "undefined"
      ? GROUP_STAGE_MATCHES
      : [];
  const results = adminData.results;

  const cards = matches
    .map((m) => {
      const r = results[m.id];
      return `
      <form class="result-form" data-match-id="${m.id}">
        <div class="result-form__info">
          <span class="result-form__id">${m.id}</span>
          <strong>Grupo ${m.group}</strong> · Fecha ${m.matchday}<br />
          ${teamName(m.home)} vs ${teamName(m.away)}
        </div>
        <div class="result-form__inputs">
          <input type="number" min="0" max="99" name="home" value="${r?.homeScore ?? ""}" placeholder="0" aria-label="Goles local" />
          <span>:</span>
          <input type="number" min="0" max="99" name="away" value="${r?.awayScore ?? ""}" placeholder="0" aria-label="Goles visitante" />
          <button type="submit" class="btn btn--small btn--primary">Guardar</button>
          ${r ? '<button type="button" class="btn btn--small btn--ghost btn-clear-result">Borrar</button>' : ""}
        </div>
        <span class="result-form__status" role="status"></span>
      </form>`;
    })
    .join("");

  return `
    <p class="admin-hint">Cargá el resultado oficial de cada partido. El ranking se actualiza automáticamente.</p>
    <div class="result-forms">${cards}</div>`;
}

function renderAdminPanel() {
  const root = document.getElementById("admin-content");
  if (!root) return;

  renderAdminNav();

  if (adminView === "ranking") root.innerHTML = renderRanking();
  else if (adminView === "predictions") root.innerHTML = renderPredictionsTable();
  else root.innerHTML = renderResultsForm();

  bindAdminPanelEvents(root);
}

function bindAdminPanelEvents(root) {
  root.querySelector("#admin-pred-search")?.addEventListener("input", () => renderAdminPanel());
  root.querySelector("#admin-pred-filter")?.addEventListener("change", () => renderAdminPanel());

  root.querySelectorAll(".result-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const matchId = form.dataset.matchId;
      const status = form.querySelector(".result-form__status");
      const home = Number(form.querySelector('[name="home"]').value);
      const away = Number(form.querySelector('[name="away"]').value);
      if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        status.textContent = "Completá ambos goles";
        return;
      }
      status.textContent = "Guardando…";
      try {
        await AuthAPI.adminSaveResult(matchId, home, away);
        status.textContent = "Guardado ✓";
        await loadAdminData();
        renderAdminPanel();
      } catch (err) {
        status.textContent = err.message;
      }
    });

    form.querySelector(".btn-clear-result")?.addEventListener("click", async () => {
      const matchId = form.dataset.matchId;
      const status = form.querySelector(".result-form__status");
      status.textContent = "Borrando…";
      try {
        await AuthAPI.adminDeleteResult(matchId);
        await loadAdminData();
        renderAdminPanel();
      } catch (err) {
        status.textContent = err.message;
      }
    });
  });
}

async function loadAdminData() {
  if (!window.AuthState?.getUser()?.isAdmin) return;

  const [dashboard, predData, resData] = await Promise.all([
    AuthAPI.adminDashboard(),
    AuthAPI.adminPredictions(),
    AuthAPI.adminResults(),
  ]);

  adminData.dashboard = dashboard;
  adminData.predictions = predData.predictions;
  adminData.results = resData.results;
  adminData.matches = resData.matches;
}

async function onAdminPanelOpen() {
  const root = document.getElementById("admin-content");
  if (!root) return;
  root.innerHTML = '<p class="admin-loading">Cargando panel…</p>';

  try {
    await window.AuthState?.refreshUser?.();
    updateAdminTabVisibility();
    if (!window.AuthState?.getUser()?.isAdmin) {
      root.innerHTML = '<p class="admin-empty">No tenés permisos de administrador.</p>';
      return;
    }
    await loadAdminData();
    renderAdminPanel();
  } catch (err) {
    root.innerHTML = `<p class="admin-empty">${escapeHtml(err.message)}</p>`;
  }
}

function initAdmin() {
  updateAdminTabVisibility();

  window.addEventListener("auth:change", () => {
    updateAdminTabVisibility();
  });

  document.getElementById("tab-admin")?.addEventListener("click", () => {
    if (window.AuthState?.getUser()?.isAdmin) onAdminPanelOpen();
  });

  const tabs = document.querySelectorAll(".tabs .tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.panel === "admin" && window.AuthState?.getUser()?.isAdmin) {
        onAdminPanelOpen();
      }
    });
  });
}

window.updateAdminTabVisibility = updateAdminTabVisibility;
initAdmin();
