const logger = require("../logger");
const BASE_URL = process.env.WORLDCUP_API_BASE_URL || "https://worldcup26.ir";

const log = logger.child({ component: "worldcup-api" });

/** API name → fixture-data.js name */
const TEAM_ALIASES = {
  "South Korea": "Korea Republic",
  "Czech Republic": "Czechia",
  "United States": "USA",
  Turkey: "Türkiye",
  "Ivory Coast": "Côte d'Ivoire",
  Iran: "IR Iran",
  "Cape Verde": "Cabo Verde",
  "Democratic Republic of the Congo": "Congo DR",
};

function normalizeTeamName(apiName) {
  if (!apiName) return apiName;
  return TEAM_ALIASES[apiName] || apiName;
}

function toLocalMatchId(apiId) {
  return `m${String(apiId).padStart(3, "0")}`;
}

function toApiId(matchId) {
  const n = parseInt(String(matchId).replace(/^m/i, ""), 10);
  return Number.isFinite(n) ? String(n) : null;
}

function parseStatus(finished, timeElapsed) {
  const fin = String(finished).toUpperCase() === "TRUE";
  const elapsed = String(timeElapsed || "").toLowerCase();
  if (fin) return "finished";
  if (elapsed && elapsed !== "notstarted") return "live";
  return "scheduled";
}

function parseGame(raw) {
  const homeScore = parseInt(raw.home_score, 10) || 0;
  const awayScore = parseInt(raw.away_score, 10) || 0;
  const timeElapsed = raw.time_elapsed || "notstarted";
  const status = parseStatus(raw.finished, timeElapsed);

  return {
    mongoId: raw._id,
    apiId: String(raw.id),
    matchId: toLocalMatchId(raw.id),
    home: normalizeTeamName(raw.home_team_name_en),
    away: normalizeTeamName(raw.away_team_name_en),
    group: raw.group,
    matchday: Number(raw.matchday),
    homeScore,
    awayScore,
    finished: String(raw.finished).toUpperCase() === "TRUE",
    timeElapsed,
    status,
    type: raw.type,
  };
}

function isPlaying(parsed) {
  return parsed.status === "live";
}

async function fetchGame(mongoId, matchId = null) {
  const start = Date.now();
  const op = "fetchGame";
  try {
    const res = await fetch(`${BASE_URL}/get/game/${mongoId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = new Error(`worldcup26 API ${res.status} for game ${mongoId}`);
      log.warn(
        { op, mongoId, matchId, status: res.status, durationMs: Date.now() - start },
        "fetch failed"
      );
      throw err;
    }
    const data = await res.json();
    const raw = data.game ?? data;
    const parsed = parseGame(raw);
    const fields = {
      op,
      mongoId,
      matchId: matchId || parsed.matchId,
      status: parsed.status,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      timeElapsed: parsed.timeElapsed,
      durationMs: Date.now() - start,
    };
    if (parsed.status === "scheduled") {
      log.debug(fields, "fetch complete");
    } else {
      log.info(fields, "fetch complete");
    }
    return parsed;
  } catch (err) {
    if (!err.message?.includes("worldcup26 API")) {
      log.warn(
        { op, mongoId, matchId, err, durationMs: Date.now() - start },
        "fetch error"
      );
    }
    throw err;
  }
}

/** matchId (m001) → mongo _id, cargado una vez al arrancar el sync */
let mongoIdByMatchId = null;

async function loadMongoIdMap() {
  if (mongoIdByMatchId) return mongoIdByMatchId;

  const start = Date.now();
  const op = "loadMongoIdMap";
  const res = await fetch(`${BASE_URL}/get/games`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    log.error(
      { op, status: res.status, durationMs: Date.now() - start },
      "failed to load games map"
    );
    throw new Error(`worldcup26 API ${res.status} for /get/games`);
  }
  const data = await res.json();
  mongoIdByMatchId = new Map();
  for (const raw of data.games || []) {
    if (raw.type !== "group") continue;
    mongoIdByMatchId.set(toLocalMatchId(raw.id), raw._id);
  }
  log.info(
    { op, gameCount: mongoIdByMatchId.size, durationMs: Date.now() - start },
    "games map loaded"
  );
  return mongoIdByMatchId;
}

async function fetchGameForMatch(matchId) {
  const map = await loadMongoIdMap();
  const mongoId = map.get(matchId);
  if (!mongoId) {
    log.warn({ op: "fetchGameForMatch", matchId }, "missing API id for match");
    throw new Error(`Sin ID de API para ${matchId}`);
  }
  return fetchGame(mongoId, matchId);
}

/** Bulk fetch for manual / scheduled result sync */
async function fetchGroupGames() {
  const start = Date.now();
  const op = "fetchGroupGames";
  try {
    const res = await fetch(`${BASE_URL}/get/games`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      log.warn(
        { op, status: res.status, durationMs: Date.now() - start },
        "fetch failed"
      );
      throw new Error(`worldcup26 API ${res.status} for /get/games`);
    }
    const data = await res.json();
    const games = (data.games || [])
      .filter((g) => g.type === "group")
      .map(parseGame);
    const withResults = games.filter(
      (g) => g.status === "live" || g.status === "finished"
    ).length;
    log.info(
      {
        op,
        gameCount: games.length,
        withResults,
        durationMs: Date.now() - start,
      },
      "group games fetched"
    );
    return games;
  } catch (err) {
    if (!err.message?.includes("worldcup26 API")) {
      log.warn({ op, err, durationMs: Date.now() - start }, "fetch error");
    }
    throw err;
  }
}

module.exports = {
  BASE_URL,
  normalizeTeamName,
  toLocalMatchId,
  toApiId,
  parseGame,
  parseStatus,
  isPlaying,
  fetchGame,
  fetchGameForMatch,
  loadMongoIdMap,
  fetchGroupGames,
};
