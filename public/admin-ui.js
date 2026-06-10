const ADMIN_VIEWS = ["ranking", "predictions", "results"];
let adminView = "ranking";
let adminData = { dashboard: null, predictions: [], results: {}, matches: [] };
let syncStatus = { loading: false, message: "", isError: false };

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
      <p class="admin-empty">Todavía no hay puntos: aún no hay partidos finalizados con resultado de la API, o los usuarios no han pronosticado.</p>
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
      <div class="stat-card"><span class="stat-card__n">${stats?.matchesWithResult ?? 0}/${stats?.totalMatches ?? 72}</span><span class="stat-card__l">Partidos finalizados (API)</span></div>
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

function getFilteredPredictions(search, filter) {
  let list = adminData.predictions;

  if (filter !== "all") {
    list = list.filter((p) => p.group === filter);
  }

  if (search) {
    list = list.filter(
      (p) =>
        p.displayName.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        teamName(p.home).toLowerCase().includes(search) ||
        teamName(p.away).toLowerCase().includes(search)
    );
  }

  return list;
}

function renderPredictionRows(list) {
  return list
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.displayName)}</td>
      <td>Grupo ${p.group} · Fecha ${p.matchday}</td>
      <td>${teamName(p.home)} vs ${teamName(p.away)}</td>
      <td class="num">${p.prediction.homeScore} : ${p.prediction.awayScore}</td>
      <td class="num">${p.result ? `${p.result.homeScore} : ${p.result.awayScore}` : "—"}</td>
      <td>${renderScoreBadge(p.scoreType, p.points)}</td>
    </tr>`
    )
    .join("");
}

function updatePredictionsTableBody(root) {
  const search = (root.querySelector("#admin-pred-search")?.value || "").toLowerCase();
  const filter = root.querySelector("#admin-pred-filter")?.value || "all";
  const list = getFilteredPredictions(search, filter);

  const emptyEl = root.querySelector("#admin-pred-empty");
  const tableWrap = root.querySelector("#admin-pred-table-wrap");
  const tbody = root.querySelector("#admin-pred-tbody");
  if (!emptyEl || !tableWrap || !tbody) return;

  if (!list.length) {
    emptyEl.hidden = false;
    tableWrap.hidden = true;
    tbody.innerHTML = "";
    return;
  }

  emptyEl.hidden = true;
  tableWrap.hidden = false;
  tbody.innerHTML = renderPredictionRows(list);
}

function renderPredictionsTable() {
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
    <p class="admin-empty" id="admin-pred-empty" hidden>No hay pronósticos para mostrar.</p>
    <div class="admin-table-wrap" id="admin-pred-table-wrap">
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
        <tbody id="admin-pred-tbody"></tbody>
      </table>
    </div>`;
}

function formatSyncedAt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function statusBadge(status) {
  if (status === "live") return '<span class="badge badge--live">En vivo</span>';
  if (status === "finished") return '<span class="badge badge--finished">Final</span>';
  if (status) return `<span class="badge badge--muted">${escapeHtml(status)}</span>`;
  return '<span class="badge badge--muted">Sin dato</span>';
}

function renderResultsReadOnly() {
  const matches = adminData.matches.length
    ? adminData.matches
    : typeof GROUP_STAGE_MATCHES !== "undefined"
      ? GROUP_STAGE_MATCHES
      : [];
  const results = adminData.results;

  const cards = matches
    .map((m) => {
      const r = results[m.id];
      const score =
        r && Number.isInteger(r.homeScore) && Number.isInteger(r.awayScore)
          ? `${r.homeScore} : ${r.awayScore}`
          : "—";
      const apiBadge = r
        ? '<span class="badge badge--ok">API</span>'
        : '<span class="badge badge--muted">Pendiente</span>';
      return `
      <article class="result-form result-form--readonly" data-match-id="${m.id}">
        <div class="result-form__info">
          <span class="result-form__id">${m.id}</span>
          <strong>Grupo ${m.group}</strong> · Fecha ${m.matchday}<br />
          ${teamName(m.home)} vs ${teamName(m.away)}
          <div class="result-form__meta">${apiBadge} ${statusBadge(r?.status)}</div>
        </div>
        <div class="result-form__score-readonly">
          <span class="result-form__score-value">${score}</span>
          <span class="result-form__sync muted">Última sync: ${formatSyncedAt(r?.syncedAt)}</span>
        </div>
      </article>`;
    })
    .join("");

  return `
    <div class="admin-filters admin-filters--sync">
      <button type="button" class="btn btn--small btn--primary" id="admin-sync-results"${syncStatus.loading ? " disabled" : ""}>
        ${syncStatus.loading ? "Actualizando…" : "Actualizar desde API"}
      </button>
      ${syncStatus.message ? `<span class="admin-sync-status${syncStatus.isError ? " admin-sync-status--err" : " admin-sync-status--ok"}">${escapeHtml(syncStatus.message)}</span>` : ""}
    </div>
    <p class="admin-hint">Los resultados se sincronizan automáticamente desde la API externa. Podés forzar una actualización manual con el botón de arriba.</p>
    <div class="result-forms">${cards}</div>`;
}

function renderAdminPanel() {
  const root = document.getElementById("admin-content");
  if (!root) return;

  renderAdminNav();

  if (adminView === "ranking") root.innerHTML = renderRanking();
  else if (adminView === "predictions") {
    root.innerHTML = renderPredictionsTable();
    updatePredictionsTableBody(root);
  } else root.innerHTML = renderResultsReadOnly();

  bindAdminPanelEvents(root);
}

function bindAdminPanelEvents(root) {
  root.querySelector("#admin-pred-search")?.addEventListener("input", () => updatePredictionsTableBody(root));
  root.querySelector("#admin-pred-filter")?.addEventListener("change", () => updatePredictionsTableBody(root));
  root.querySelector("#admin-sync-results")?.addEventListener("click", handleSyncResults);
}

async function handleSyncResults() {
  if (syncStatus.loading) return;

  syncStatus = { loading: true, message: "", isError: false };
  renderAdminPanel();

  try {
    const data = await AuthAPI.adminSyncResults();
    const parts = [];
    if (data.synced) parts.push(`${data.synced} actualizado(s)`);
    if (data.unchanged) parts.push(`${data.unchanged} sin cambios`);
    if (data.errors?.length) parts.push(`${data.errors.length} error(es)`);

    syncStatus = {
      loading: false,
      message: parts.length ? parts.join(" · ") : "Sin partidos en vivo o finalizados en la API.",
      isError: !!data.errors?.length,
    };

    await loadAdminData();
    window.dispatchEvent(new CustomEvent("results:synced"));
  } catch (err) {
    syncStatus = { loading: false, message: err.message, isError: true };
  }

  renderAdminPanel();
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

  window.addEventListener("panel:open", (e) => {
    if (e.detail?.panel === "admin" && window.AuthState?.getUser()?.isAdmin) {
      onAdminPanelOpen();
    }
  });
}

window.updateAdminTabVisibility = updateAdminTabVisibility;
initAdmin();
