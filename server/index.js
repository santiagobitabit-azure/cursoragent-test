const express = require("express");
const path = require("path");
const pinoHttp = require("pino-http");
const logger = require("./logger");
const { init, pool } = require("./db");
const authRoutes = require("./routes/auth");
const predictionRoutes = require("./routes/predictions");
const adminRoutes = require("./routes/admin");
const matchesRoutes = require("./routes/matches");
const leaderboardRoutes = require("./routes/leaderboard");
const { startLiveSync } = require("./services/live-sync");

const app = express();
const PORT = process.env.PORT || 8080;

const STATIC_ASSET = /\.(js|css|ico|png|svg|woff2?|html)$/i;

function shouldIgnoreRequest(req) {
  const url = req.url?.split("?")[0] || "";
  if (url === "/api/health") return true;
  if (req.method === "GET" && !url.startsWith("/api")) {
    if (url === "/" || STATIC_ASSET.test(url)) return true;
  }
  return false;
}

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: shouldIgnoreRequest,
    },
    customLogLevel(req, res, err) {
      if (shouldIgnoreRequest(req)) return "silent";
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: "Base de datos no disponible." });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.use(express.static(path.join(__dirname, "..")));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.use((err, req, res, next) => {
  if (req.log) {
    req.log.error({ err }, "unhandled error");
  } else {
    logger.error({ err }, "unhandled error");
  }
  res.status(500).json({ error: "Error interno del servidor." });
});

init()
  .then(() => {
    startLiveSync();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "server listening");
    });
  })
  .catch((err) => {
    logger.fatal({ err }, "database init failed");
    process.exit(1);
  });
