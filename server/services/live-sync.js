const logger = require("../logger");
const { loadMatches } = require("../matches");
const { fetchGameForMatch, fetchGroupGames, loadMongoIdMap } = require("./worldcup-api");
const { upsertFromApi, getResult } = require("./match-results");

const log = logger.child({ component: "live-sync" });

const WATCH_MS = Number(process.env.LIVE_SYNC_WATCH_INTERVAL_MS) || 60_000;
const LIVE_MS = Number(process.env.LIVE_SYNC_LIVE_INTERVAL_MS) || 60_000;
const WINDOW_HOURS = Number(process.env.LIVE_SYNC_MATCH_WINDOW_HOURS) || 2.5;

/** @type {Map<string, { intervalId: ReturnType<typeof setInterval>, phase: 'watch'|'live', windowEndMs: number }>} */
const activePollers = new Map();

/** @type {Map<string, number>} */
const lastSyncByMatch = new Map();

let kickoffTimers = [];
let pollCount = 0;
/** @type {{ matchId: string, message: string, at: string } | null} */
let lastError = null;

function getSyncState() {
  const activeMatches = [...activePollers.keys()];
  const lastAt = activeMatches.length
    ? Math.max(...activeMatches.map((id) => lastSyncByMatch.get(id) || 0))
    : null;
  return {
    ok: true,
    activeMatches,
    lastAt: lastAt ? new Date(lastAt).toISOString() : null,
    pollCount,
    lastError,
  };
}

function stopPoller(matchId, reason = "window_end") {
  const poller = activePollers.get(matchId);
  if (!poller) return;
  clearInterval(poller.intervalId);
  activePollers.delete(matchId);
  log.info({ matchId, phase: poller.phase, reason }, "poller stopped");
}

async function tickMatch(matchId, windowEndMs) {
  if (windowEndMs && Date.now() >= windowEndMs) {
    stopPoller(matchId, "window_end");
    return;
  }

  pollCount += 1;

  let parsed;
  try {
    parsed = await fetchGameForMatch(matchId);
  } catch (err) {
    lastError = {
      matchId,
      message: err.message,
      at: new Date().toISOString(),
    };
    log.warn({ matchId, err }, "tick failed");
    return;
  }

  const poller = activePollers.get(matchId);
  if (!poller) return;

  if (parsed.status === "scheduled") {
    log.debug({ matchId, status: parsed.status }, "tick unchanged");
    return;
  }

  if (parsed.status === "live" || parsed.status === "finished") {
    log.info(
      {
        matchId,
        status: parsed.status,
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        timeElapsed: parsed.timeElapsed,
      },
      "updating result from API poll"
    );
    await upsertFromApi(parsed);
    lastSyncByMatch.set(matchId, Date.now());
  }

  if (parsed.status === "live" && poller.phase === "watch") {
    clearInterval(poller.intervalId);
    poller.phase = "live";
    poller.intervalId = setInterval(
      () => tickMatch(matchId, poller.windowEndMs),
      LIVE_MS
    );
    activePollers.set(matchId, poller);
    log.info({ matchId, phase: "live", windowEndMs: poller.windowEndMs }, "poller phase upgraded");
  }

  if (parsed.status === "finished") {
    stopPoller(matchId, "finished");
    log.info(
      {
        matchId,
        homeScore: parsed.homeScore,
        awayScore: parsed.awayScore,
        status: parsed.status,
      },
      "match finished"
    );
  }
}

function startPoller(matchId, windowEndMs) {
  if (activePollers.has(matchId)) return;

  const intervalId = setInterval(() => tickMatch(matchId, windowEndMs), WATCH_MS);
  activePollers.set(matchId, { intervalId, phase: "watch", windowEndMs });
  tickMatch(matchId, windowEndMs);

  const remaining = windowEndMs - Date.now();
  if (remaining > 0) {
    setTimeout(() => stopPoller(matchId, "window_timeout"), remaining);
  }

  log.info({ matchId, phase: "watch", windowEndMs }, "poller started");
}

function scheduleKickoff(match) {
  const kickoff = new Date(match.kickoff).getTime();
  const windowEnd = kickoff + WINDOW_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  if (now >= windowEnd) return;

  const startPoll = () => {
    if (Date.now() >= windowEnd) return;
    startPoller(match.id, windowEnd);
  };

  if (now >= kickoff) {
    startPoll();
    return;
  }

  const timer = setTimeout(startPoll, kickoff - now);
  kickoffTimers.push(timer);
}

async function resumeInProgressMatches() {
  const { matches } = loadMatches();
  const now = Date.now();
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;

  for (const match of matches) {
    const kickoff = new Date(match.kickoff).getTime();
    if (now < kickoff || now >= kickoff + windowMs) continue;
    const existing = await getResult(match.id);
    if (existing?.status === "finished") continue;

    startPoller(match.id, kickoff + windowMs);
  }
}

function startLiveSync() {
  if (process.env.LIVE_SYNC_ENABLED === "false") {
    log.info({ enabled: false }, "live sync disabled");
    return;
  }

  loadMongoIdMap()
    .then(() => {
      const { matches } = loadMatches();
      for (const match of matches) {
        scheduleKickoff(match);
      }
      return resumeInProgressMatches();
    })
    .then(() => {
      const { matches } = loadMatches();
      log.info({ matchCount: matches.length }, "kickoffs scheduled");
    })
    .catch((err) => {
      lastError = { matchId: null, message: err.message, at: new Date().toISOString() };
      log.error({ err }, "failed to start live sync");
    });
}

function stopLiveSync() {
  for (const timer of kickoffTimers) clearTimeout(timer);
  kickoffTimers = [];
  for (const matchId of [...activePollers.keys()]) stopPoller(matchId, "shutdown");
}

async function syncAllResultsFromApi() {
  const { ids } = loadMatches();
  log.info({ matchCount: ids.size }, "starting bulk result sync from API");
  const games = await fetchGroupGames();
  pollCount += 1;
  const relevant = games.filter((g) => ids.has(g.matchId));
  log.info(
    {
      apiGameCount: games.length,
      trackedCount: relevant.length,
      liveOrFinished: relevant.filter(
        (g) => g.status === "live" || g.status === "finished"
      ).length,
    },
    "API games loaded for sync"
  );

  let synced = 0;
  let unchanged = 0;
  let scheduled = 0;
  const errors = [];

  for (const parsed of games) {
    if (!ids.has(parsed.matchId)) continue;

    if (parsed.status !== "live" && parsed.status !== "finished") {
      scheduled += 1;
      continue;
    }

    try {
      const existing = await getResult(parsed.matchId);
      const changed =
        !existing ||
        existing.homeScore !== parsed.homeScore ||
        existing.awayScore !== parsed.awayScore ||
        existing.status !== parsed.status ||
        existing.timeElapsed !== parsed.timeElapsed;

      if (changed) {
        log.info(
          {
            matchId: parsed.matchId,
            status: parsed.status,
            homeScore: parsed.homeScore,
            awayScore: parsed.awayScore,
            timeElapsed: parsed.timeElapsed,
          },
          "updating result from bulk sync"
        );
      }
      await upsertFromApi(parsed);
      lastSyncByMatch.set(parsed.matchId, Date.now());
      if (changed) synced += 1;
      else unchanged += 1;
    } catch (err) {
      errors.push({ matchId: parsed.matchId, message: err.message });
      log.warn({ matchId: parsed.matchId, err }, "manual sync failed for match");
    }
  }

  if (errors.length) {
    lastError = {
      matchId: errors[0].matchId,
      message: errors[0].message,
      at: new Date().toISOString(),
    };
  }

  log.info({ synced, unchanged, scheduled, errorCount: errors.length }, "manual sync complete");

  return {
    ok: true,
    synced,
    unchanged,
    scheduled,
    errors,
    sync: getSyncState(),
  };
}

module.exports = { startLiveSync, stopLiveSync, getSyncState, syncAllResultsFromApi };
