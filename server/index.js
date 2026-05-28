const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const predictionRoutes = require("./routes/predictions");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(path.join(__dirname, "..")));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`Mundial 2026 → http://localhost:${PORT}`);
});
