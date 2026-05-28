const TZ_AR = "America/Argentina/Buenos_Aires";
const GROUP_IDS = "ABCDEFGHIJKL".split("");

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
  const argClass = involvesArgentina(match) ? " match--arg" : "";
  return `
    <li class="match${argClass}">
      <div class="match__meta">
        <span class="match__date">${dateFmt.format(when)}</span>
        <span class="match__time">${timeFmt.format(when)} hs</span>
        <span class="match__md">Fecha ${match.matchday}</span>
      </div>
      <p class="match__teams">${teamLabel(match.home)} <span class="vs">vs</span> ${teamLabel(match.away)}</p>
      <p class="match__venue">${venueLabel(match.venue)}</p>
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

  const groups = filterGroup === "all" ? GROUP_IDS : [filterGroup];
  grid.innerHTML = groups.map(renderGroupCard).join("");
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

initFixture();
