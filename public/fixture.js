const TZ_AR = "America/Argentina/Buenos_Aires";
const GROUP_IDS = "ABCDEFGHIJKL".split("");
const LIVE_POLL_MS = 60_000;

let currentFilter = "all";
let liveResults = {};
let pollTimer = null;
let fixturePanelActive = false;

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TZ_AR,
});
const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ_AR,
});

function teamLabel(id) {
  const name = TEAM_NAMES_ES[id] || id;
  const flag = TEAM_FLAGS[id] || "";
  return `${flag} ${name}`.trim();
}

function venueLabel(id) {
  return VENUES_ES[id] || id;
}

function involvesArgentina(match) {
  return match.home === "Argentina" || match.away === "Argentina";
}

function isPredictionClosed(match) {
  const result = liveResults[match.id];
  if (result?.status === "live" || result?.status === "finished") return true;
  const kickoff = new Date(match.kickoff).getTime();
  return Date.now() >= kickoff - 5 * 60 * 1000;
}

function renderLiveScore(match) {
  const result = liveResults[match.id];
  if (!result) return "";

  if (result.status === "live") {
    const minute = result.timeElapsed ? ` · ${result.timeElapsed}'` : "";
    return `
      <div class="match__live">
        <span class="match__badge match__badge--live">EN VIVO${minute}</span>
        <span class="match__score-live">${result.homeScore} : ${result.awayScore}</span>
      </div>`;
  }

  if (result.status === "finished") {
    return `
      <div class="match__live">
        <span class="match__badge match__badge--finished">FINAL</span>
        <span class="match__score-live">${result.homeScore} : ${result.awayScore}</span>
      </div>`;
  }

  return "";
}

function renderPredictionForm(match) {
  const pred = window.AuthState.getPredictions()[match.id];
  const homeVal = pred?.homeScore ?? "";
  const awayVal = pred?.awayScore ?? "";

  return `
    <form class="prediction-form" data-match-id="${match.id}" novalidate>
      <span class="prediction-form__label">Tu pronóstico</span>
      <div class="prediction-form__scores">
        <input type="number" min="0" max="99" class="score-input" name="home" value="${homeVal}" aria-label="Goles local" placeholder="0" />
        <span class="prediction-form__sep">:</span>
        <input type="number" min="0" max="99" class="score-input" name="away" value="${awayVal}" aria-label="Goles visitante" placeholder="0" />
      </div>
      <button type="submit" class="btn btn--small btn--primary">Guardar</button>
      <span class="prediction-form__status" role="status" aria-live="polite"></span>
    </form>`;
}

function renderPredictionSummary(match) {
  const pred = window.AuthState.getPredictions()[match.id];
  if (!pred) {
    return `<p class="prediction-hint prediction-hint--closed prediction-summary--empty">No guardaste pronóstico para este partido</p>`;
  }

  const result = liveResults[match.id];
  let badge = "";
  if (result?.status === "finished") {
    const { points, type } = scorePrediction(
      pred.homeScore,
      pred.awayScore,
      result.homeScore,
      result.awayScore
    );
    badge = renderScoreBadge(type, points);
  }

  return `
    <div class="prediction-summary">
      <span class="prediction-summary__label">Tu pronóstico</span>
      <span class="prediction-summary__score">${pred.homeScore} : ${pred.awayScore}</span>
      ${badge}
    </div>`;
}

function renderPredictionSection(match) {
  if (!window.AuthState?.isLoggedIn()) {
    return `<p class="prediction-hint">Iniciá sesión para pronosticar</p>`;
  }

  if (window.AuthState.isAdmin()) {
    return "";
  }

  if (!isPredictionClosed(match)) {
    return renderPredictionForm(match);
  }

  return renderPredictionSummary(match);
}

function renderTeams(groupId) {
  const teams = WORLD_CUP_GROUPS[groupId];
  return teams
    .map(
      (t) =>
        `<li class="team${t === "Argentina" ? " team--arg" : ""}">${teamLabel(t)}</li>`
    )
    .join("");
}

function renderMatch(match) {
  const when = new Date(match.kickoff);
  const result = liveResults[match.id];
  const argClass = involvesArgentina(match) ? " match--arg" : "";
  const liveClass = result?.status === "live" ? " match--live" : "";
  const hasPred =
    window.AuthState?.isLoggedIn() &&
    !window.AuthState.isAdmin() &&
    window.AuthState.getPredictions()[match.id];
  const savedClass = hasPred ? " match--saved" : "";

  return `
    <li class="match${argClass}${liveClass}${savedClass}" data-match-id="${match.id}">
      <div class="match__meta">
        <span class="match__date">${dateFmt.format(when)}</span>
        <span class="match__time">${timeFmt.format(when)} hs</span>
        <span class="match__md">Fecha ${match.matchday}</span>
      </div>
      <p class="match__teams">${teamLabel(match.home)} <span class="vs">vs</span> ${teamLabel(match.away)}</p>
      ${renderLiveScore(match)}
      <p class="match__venue">${venueLabel(match.venue)}</p>
      ${renderPredictionSection(match)}
    </li>`;
}

function renderGroupCard(groupId) {
  const matches = GROUP_STAGE_MATCHES.filter((m) => m.group === groupId);
  const highlight = groupId === "J" ? " group-card--arg" : "";
  return `
    <article class="group-card${highlight}" id="grupo-${groupId}">
      <header class="group-card__head">
        <h3>Grupo ${groupId}</h3>
      </header>
      <ul class="group-card__teams" aria-label="Equipos del grupo ${groupId}">
        ${renderTeams(groupId)}
      </ul>
      <ol class="group-card__matches" aria-label="Partidos del grupo ${groupId}">
        ${matches.map(renderMatch).join("")}
      </ol>
    </article>`;
}

function renderFixture(filterGroup = "all") {
  const grid = document.getElementById("fixture-grid");
  if (!grid) return;

  currentFilter = filterGroup;
  const groups = filterGroup === "all" ? GROUP_IDS : [filterGroup];
  grid.innerHTML = groups.map(renderGroupCard).join("");
  bindPredictionForms(grid);
}

function stopLivePolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function scheduleLivePolling(activeMatches) {
  stopLivePolling();
  if (!fixturePanelActive || !activeMatches?.length) return;
  pollTimer = setInterval(() => loadLiveResults(), LIVE_POLL_MS);
}

async function loadLiveResults() {
  try {
    const prevFinished = new Set(
      Object.entries(liveResults)
        .filter(([, r]) => r.status === "finished")
        .map(([id]) => id)
    );

    const data = await AuthAPI.getLiveResults();
    liveResults = data.results || {};
    renderFixture(currentFilter);
    scheduleLivePolling(data.sync?.activeMatches);

    for (const [matchId, result] of Object.entries(liveResults)) {
      if (result.status === "finished" && !prevFinished.has(matchId)) {
        window.dispatchEvent(
          new CustomEvent("match:finished", { detail: { matchId, result } })
        );
      }
    }
  } catch {
    /* silencioso en polling */
  }
}

async function onFixturePanelOpen() {
  fixturePanelActive = true;
  await loadLiveResults();
}

function onFixturePanelClose() {
  fixturePanelActive = false;
  stopLivePolling();
}

async function handlePredictionSubmit(form) {
  const matchId = form.dataset.matchId;
  const statusEl = form.querySelector(".prediction-form__status");
  const homeInput = form.querySelector('[name="home"]');
  const awayInput = form.querySelector('[name="away"]');

  const homeScore = homeInput.value === "" ? null : Number(homeInput.value);
  const awayScore = awayInput.value === "" ? null : Number(awayInput.value);

  if (homeScore === null || awayScore === null || homeScore < 0 || awayScore < 0) {
    statusEl.textContent = "Completá ambos resultados";
    statusEl.className = "prediction-form__status prediction-form__status--err";
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  statusEl.textContent = "Guardando…";
  statusEl.className = "prediction-form__status";

  try {
    await window.AuthState.savePrediction(matchId, homeScore, awayScore);
    statusEl.textContent = "Guardado ✓";
    statusEl.className = "prediction-form__status prediction-form__status--ok";
    form.closest(".match")?.classList.add("match--saved");
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = "prediction-form__status prediction-form__status--err";
  } finally {
    btn.disabled = false;
  }
}

function bindPredictionForms(container) {
  container.querySelectorAll(".prediction-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handlePredictionSubmit(form);
    });
  });
}

function initFixture() {
  const grid = document.getElementById("fixture-grid");
  const filters = document.getElementById("group-filters");
  if (!grid || !filters) return;

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-group]");
    if (!btn) return;
    filters.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("filter-btn--active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });
    renderFixture(btn.dataset.group);
  });

  window.addEventListener("auth:change", () => {
    renderFixture(currentFilter);
  });

  window.addEventListener("results:synced", () => {
    if (fixturePanelActive) loadLiveResults();
  });

  window.addEventListener("panel:open", (e) => {
    if (e.detail?.panel === "fixture") onFixturePanelOpen();
  });

  window.addEventListener("panel:close", (e) => {
    if (e.detail?.panel === "fixture") onFixturePanelClose();
  });

  renderFixture("all");
}

window.onFixturePanelOpen = onFixturePanelOpen;
window.onFixturePanelClose = onFixturePanelClose;
initFixture();
