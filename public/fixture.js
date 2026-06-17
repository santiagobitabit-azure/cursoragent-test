const TZ_AR = "America/Argentina/Buenos_Aires";
const GROUP_IDS = "ABCDEFGHIJKL".split("");
const LIVE_POLL_MS = 60_000;

let currentFilter = "all";
let liveResults = {};
let pollTimer = null;
let lastActiveMatches = [];
let lastFootballDayKey = "";
let fixturePanelActive = false;
let countdownPanelActive = true;

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
const footballDayLabelFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ_AR,
});

function getArDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(now);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour,
    minute: Number(map.minute),
  };
}

function normalizeArHour(hour) {
  return hour === 24 ? 0 : hour;
}

function shiftDateStr(year, month, day, deltaDays) {
  const dt = new Date(`${year}-${month}-${day}T12:00:00-03:00`);
  dt.setDate(dt.getDate() + deltaDays);
  return {
    year: String(dt.getFullYear()),
    month: String(dt.getMonth() + 1).padStart(2, "0"),
    day: String(dt.getDate()).padStart(2, "0"),
  };
}

function getFootballDayWindowAr(now = new Date()) {
  const { year, month, day, hour } = getArDateParts(now);
  let footballYear = year;
  let footballMonth = month;
  let footballDay = day;

  // 00:00–05:59 AR: cola del día futbolero anterior.
  // 06:00–09:59 AR: transición; seguimos mostrando el día anterior hasta las 10:00.
  if (hour < 10) {
    ({ year: footballYear, month: footballMonth, day: footballDay } = shiftDateStr(
      year,
      month,
      day,
      -1
    ));
  }

  const start = new Date(`${footballYear}-${footballMonth}-${footballDay}T10:00:00-03:00`);
  const next = shiftDateStr(footballYear, footballMonth, footballDay, 1);
  const end = new Date(`${next.year}-${next.month}-${next.day}T06:00:00-03:00`);
  const label = `${footballDayLabelFmt.format(start)} · 10:00 a 06:00 hs (Argentina)`;

  return {
    start,
    end,
    label,
    key: `${footballYear}-${footballMonth}-${footballDay}`,
  };
}

function isKickoffInFootballWindow(match, start, end) {
  const kickoffMs = new Date(match.kickoff).getTime();
  if (kickoffMs >= start.getTime() && kickoffMs < end.getTime()) return true;

  // Partidos del calendario siguiente con pitido antes de las 06:00 AR.
  const kickoffParts = getArDateParts(new Date(match.kickoff));
  const kickoffHour = normalizeArHour(kickoffParts.hour);
  const windowEndParts = getArDateParts(end);

  return (
    kickoffParts.year === windowEndParts.year &&
    kickoffParts.month === windowEndParts.month &&
    kickoffParts.day === windowEndParts.day &&
    kickoffHour < 6
  );
}

function getTodayMatches(now = new Date()) {
  const { start, end } = getFootballDayWindowAr(now);

  return GROUP_STAGE_MATCHES.filter((m) => isKickoffInFootballWindow(m, start, end)).sort(
    (a, b) => new Date(a.kickoff) - new Date(b.kickoff)
  );
}

function hasLiveTodayMatches() {
  return getTodayMatches().some((m) => liveResults[m.id]?.status === "live");
}

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

function renderTodayMatches() {
  const list = document.getElementById("today-matches-list");
  const empty = document.getElementById("today-matches-empty");
  const dateEl = document.getElementById("today-matches-date");
  if (!list) return;

  const windowInfo = getFootballDayWindowAr();
  lastFootballDayKey = windowInfo.key;
  if (dateEl) dateEl.textContent = windowInfo.label;

  const matches = getTodayMatches();
  if (empty) empty.hidden = matches.length > 0;

  if (matches.length === 0) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = matches.map(renderMatch).join("");
  bindPredictionForms(list);
}

function maybeRefreshTodayMatchesForWindowChange() {
  if (!countdownPanelActive) return false;

  const { key } = getFootballDayWindowAr();
  if (key === lastFootballDayKey) return false;

  renderTodayMatches();
  return true;
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

function refreshMatchViews() {
  renderFixture(currentFilter);
  if (countdownPanelActive) {
    renderTodayMatches();
    window.renderArgentinaCountdown?.(liveResults);
  }
}

function stopLivePolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function scheduleLivePolling(activeMatches) {
  if (activeMatches) lastActiveMatches = activeMatches;

  stopLivePolling();
  if (!fixturePanelActive && !countdownPanelActive) return;

  const shouldPoll =
    lastActiveMatches.length > 0 ||
    countdownPanelActive ||
    (fixturePanelActive && hasLiveTodayMatches());
  if (!shouldPoll) return;

  pollTimer = setInterval(() => {
    maybeRefreshTodayMatchesForWindowChange();
    loadLiveResults();
  }, LIVE_POLL_MS);
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
    refreshMatchViews();
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
  scheduleLivePolling(lastActiveMatches);
}

async function onCountdownPanelOpen() {
  countdownPanelActive = true;
  renderTodayMatches();
  await loadLiveResults();
}

function onCountdownPanelClose() {
  countdownPanelActive = false;
  scheduleLivePolling(lastActiveMatches);
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

function initPanelEvents() {
  window.addEventListener("auth:change", () => {
    refreshMatchViews();
  });

  window.addEventListener("results:synced", () => {
    if (fixturePanelActive || countdownPanelActive) loadLiveResults();
  });

  window.addEventListener("panel:open", (e) => {
    if (e.detail?.panel === "fixture") onFixturePanelOpen();
    if (e.detail?.panel === "countdown") onCountdownPanelOpen();
  });

  window.addEventListener("panel:close", (e) => {
    if (e.detail?.panel === "fixture") onFixturePanelClose();
    if (e.detail?.panel === "countdown") onCountdownPanelClose();
  });
}

function initTodayMatches() {
  initPanelEvents();
  renderTodayMatches();
  loadLiveResults();
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

  renderFixture("all");
}

window.onFixturePanelOpen = onFixturePanelOpen;
window.onFixturePanelClose = onFixturePanelClose;
initTodayMatches();
initFixture();
