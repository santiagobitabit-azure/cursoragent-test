(function () {
  const TZ_AR = "America/Argentina/Buenos_Aires";
  const ARG_GROUP = "J";

  const countdownDateFmt = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ_AR,
  });
  const countdownTimeFmt = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  });

  const titleEl = document.getElementById("countdown-title");
  const teamsEl = document.getElementById("countdown-teams");
  const metaEl = document.getElementById("countdown-meta");
  const liveEl = document.getElementById("countdown-live");
  const timerEl = document.getElementById("countdown-timer");
  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const statusEl = document.getElementById("status");
  const prevSectionEl = document.getElementById("arg-prev-results");
  const prevListEl = document.getElementById("arg-prev-list");
  const standingsBodyEl = document.getElementById("group-j-standings-body");

  let activePanel = "countdown";
  let countdownLiveResults = {};
  let countdownTargetMatch = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function teamLabel(id) {
    const name = TEAM_NAMES_ES[id] || id;
    const flag = TEAM_FLAGS[id] || "";
    return `${flag} ${name}`.trim();
  }

  function venueLabel(id) {
    return VENUES_ES[id] || id;
  }

  function getArgentinaMatches() {
    return GROUP_STAGE_MATCHES.filter(
      (m) => m.home === "Argentina" || m.away === "Argentina"
    ).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }

  function resolveNextArgentinaMatch(liveResults) {
    const matches = getArgentinaMatches();
    const live = matches.find((m) => liveResults[m.id]?.status === "live");
    if (live) return live;

    return (
      matches.find((m) => liveResults[m.id]?.status !== "finished") ?? null
    );
  }

  function computeGroupStandings(groupId, liveResults) {
    const teams = WORLD_CUP_GROUPS[groupId];
    const stats = Object.fromEntries(
      teams.map((t) => [
        t,
        { team: t, played: 0, gf: 0, ga: 0, pts: 0 },
      ])
    );

    for (const match of GROUP_STAGE_MATCHES) {
      if (match.group !== groupId) continue;
      const result = liveResults[match.id];
      if (result?.status !== "finished") continue;

      const home = stats[match.home];
      const away = stats[match.away];
      const hs = result.homeScore;
      const as = result.awayScore;

      home.played += 1;
      away.played += 1;
      home.gf += hs;
      home.ga += as;
      away.gf += as;
      away.ga += hs;

      if (hs > as) {
        home.pts += 3;
      } else if (hs < as) {
        away.pts += 3;
      } else {
        home.pts += 1;
        away.pts += 1;
      }
    }

    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  }

  function formatMatchMeta(match) {
    const when = new Date(match.kickoff);
    return `${countdownDateFmt.format(when)} · ${countdownTimeFmt.format(when)} hs (Argentina)<br />${venueLabel(match.venue)}`;
  }

  function setCountdownZeros() {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";
  }

  function renderHero(match, liveResults) {
    if (!match) {
      titleEl.textContent = "Fase de grupos finalizada";
      teamsEl.textContent = "🇦🇷 Argentina";
      metaEl.innerHTML = "Todos los partidos del Grupo J disputados";
      if (liveEl) {
        liveEl.hidden = true;
        liveEl.innerHTML = "";
      }
      if (timerEl) timerEl.hidden = true;
      statusEl.textContent = "¡Gracias por acompañar a la Scaloneta! 🇦🇷";
      statusEl.classList.add("status--done");
      return;
    }

    const result = liveResults[match.id];
    const isLive = result?.status === "live";

    titleEl.textContent = isLive
      ? "Argentina en juego"
      : "Próximo partido de Argentina";
    teamsEl.textContent = `${teamLabel(match.home)} vs ${teamLabel(match.away)}`;
    metaEl.innerHTML = formatMatchMeta(match);

    if (liveEl) {
      if (isLive) {
        const minute = result.timeElapsed ? ` · ${result.timeElapsed}'` : "";
        liveEl.innerHTML = `
        <span class="countdown-live__badge">EN VIVO${minute}</span>
        <span class="countdown-live__score">${result.homeScore} : ${result.awayScore}</span>`;
        liveEl.hidden = false;
      } else {
        liveEl.hidden = true;
        liveEl.innerHTML = "";
      }
    }

    if (timerEl) timerEl.hidden = false;
  }

  function renderPrevResults(liveResults) {
    if (!prevSectionEl || !prevListEl) return;

    const finished = getArgentinaMatches().filter(
      (m) => liveResults[m.id]?.status === "finished"
    );

    prevSectionEl.hidden = finished.length === 0;
    if (finished.length === 0) {
      prevListEl.innerHTML = "";
      return;
    }

    prevListEl.innerHTML = finished
      .map((match) => {
        const result = liveResults[match.id];
        return `
        <li class="arg-result">
          <span class="arg-result__meta">Fecha ${match.matchday}</span>
          <span class="arg-result__teams">${teamLabel(match.home)} <span class="vs">vs</span> ${teamLabel(match.away)}</span>
          <span class="arg-result__score">${result.homeScore} : ${result.awayScore}</span>
        </li>`;
      })
      .join("");
  }

  function renderGroupJStandings(liveResults) {
    if (!standingsBodyEl) return;

    const standings = computeGroupStandings(ARG_GROUP, liveResults);
    standingsBodyEl.innerHTML = standings
      .map((row, index) => {
        const gd = row.gf - row.ga;
        const gdLabel = gd > 0 ? `+${gd}` : String(gd);
        const argClass = row.team === "Argentina" ? " standings-row--arg" : "";
        return `
        <tr class="standings-row${argClass}">
          <td>${index + 1}</td>
          <td>${teamLabel(row.team)}</td>
          <td>${row.played}</td>
          <td>${gdLabel}</td>
          <td><strong>${row.pts}</strong></td>
        </tr>`;
      })
      .join("");
  }

  function updateCountdown() {
    if (!daysEl) return;

    if (!countdownTargetMatch) {
      setCountdownZeros();
      return;
    }

    const result = countdownLiveResults[countdownTargetMatch.id];
    if (result?.status === "live") {
      setCountdownZeros();
      statusEl.textContent = "Partido en curso · ¡Vamos Argentina! 🇦🇷";
      statusEl.classList.add("status--done");
      return;
    }

    const diff = new Date(countdownTargetMatch.kickoff).getTime() - Date.now();

    if (diff <= 0) {
      setCountdownZeros();
      statusEl.textContent = "¡Arrancó el partido! ¡Vamos Argentina! 🇦🇷";
      statusEl.classList.add("status--done");
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);

    statusEl.textContent = "Falta para el pitido inicial";
    statusEl.classList.remove("status--done");
  }

  function renderArgentinaCountdown(liveResults = {}) {
    countdownLiveResults = liveResults;
    countdownTargetMatch = resolveNextArgentinaMatch(liveResults);
    renderHero(countdownTargetMatch, liveResults);
    renderPrevResults(liveResults);
    renderGroupJStandings(liveResults);
    updateCountdown();
  }

  function switchPanel(target) {
    if (activePanel === target) return;

    window.dispatchEvent(
      new CustomEvent("panel:close", { detail: { panel: activePanel } })
    );

    const tabs = document.querySelectorAll(".tabs .tab");
    const panels = document.querySelectorAll(".panel");

    tabs.forEach((tab) => {
      const active = tab.dataset.panel === target;
      tab.classList.toggle("tab--active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const show = panel.id === `panel-${target}`;
      panel.classList.toggle("panel--active", show);
      panel.hidden = !show;
    });

    activePanel = target;
    window.dispatchEvent(
      new CustomEvent("panel:open", { detail: { panel: target } })
    );
  }

  function initTabs() {
    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        switchPanel(tab.dataset.panel);
      });
    });
  }

  window.renderArgentinaCountdown = renderArgentinaCountdown;

  initTabs();
  renderArgentinaCountdown();
  setInterval(updateCountdown, 1000);

  if (window.AuthAPI?.getLiveResults) {
    AuthAPI.getLiveResults()
      .then((data) => renderArgentinaCountdown(data.results || {}))
      .catch(() => {});
  }
})();
