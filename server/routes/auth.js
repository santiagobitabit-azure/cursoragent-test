const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { signToken, JWT_SECRET } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const { maskEmail } = logger;
const {
  getPublicConfig,
  verifyMicrosoftIdToken,
} = require("../services/microsoft-auth");

const router = express.Router();
const log = logger.child({ component: "auth" });

function userResponse(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: !!row.is_admin,
  };
}

async function findOrCreateMicrosoftUser({ oid, email, name }) {
  const { rows: byOid } = await pool.query(
    "SELECT id, email, display_name, is_admin FROM users WHERE microsoft_oid = $1",
    [oid]
  );
  if (byOid[0]) return byOid[0];

  if (email) {
    const { rows: byEmail } = await pool.query(
      "SELECT id, email, display_name, is_admin, microsoft_oid FROM users WHERE email = $1",
      [email]
    );
    if (byEmail[0]) {
      if (!byEmail[0].microsoft_oid) {
        await pool.query(
          `UPDATE users
           SET microsoft_oid = $1,
               auth_provider = CASE WHEN auth_provider = 'local' THEN 'microsoft' ELSE auth_provider END
           WHERE id = $2`,
          [oid, byEmail[0].id]
        );
      }
      return byEmail[0];
    }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("No se pudo obtener un email válido de la cuenta Microsoft.");
    err.status = 400;
    throw err;
  }

  const displayName = name.length >= 2 ? name : email.split("@")[0];
  const { rows } = await pool.query(
    `INSERT INTO users (email, display_name, password_hash, auth_provider, microsoft_oid, is_admin)
     VALUES ($1, $2, NULL, 'microsoft', $3, FALSE)
     RETURNING id, email, display_name, is_admin`,
    [email, displayName, oid]
  );
  return rows[0];
}

router.get("/config", (_req, res) => {
  const microsoft = getPublicConfig();
  res.json({ microsoft });
});

router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body || {};
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const name = String(displayName || "").trim();
  const pass = String(password || "");

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    log.warn({ reason: "invalid_email", email: maskEmail(trimmedEmail) }, "register failed");
    return res.status(400).json({ error: "Ingresá un email válido." });
  }
  if (name.length < 2) {
    log.warn({ reason: "invalid_display_name", email: maskEmail(trimmedEmail) }, "register failed");
    return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres." });
  }
  if (pass.length < 6) {
    log.warn({ reason: "invalid_password", email: maskEmail(trimmedEmail) }, "register failed");
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const { rows: existing } = await pool.query(
    "SELECT auth_provider FROM users WHERE email = $1",
    [trimmedEmail]
  );
  if (existing[0]?.auth_provider === "microsoft") {
    return res.status(409).json({
      error: "Este email ya está registrado con Microsoft. Usá «Continuar con Microsoft».",
    });
  }

  const hash = bcrypt.hashSync(pass, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash, auth_provider, is_admin)
       VALUES ($1, $2, $3, 'local', FALSE)
       RETURNING id, email, display_name, is_admin, created_at`,
      [trimmedEmail, name, hash]
    );
    const user = rows[0];
    const token = signToken(user);
    log.info({ userId: user.id, email: maskEmail(trimmedEmail) }, "user registered");
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    if (err.code === "23505") {
      log.warn({ reason: "duplicate_email", email: maskEmail(trimmedEmail) }, "register failed");
      return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");

  const { rows } = await pool.query(
    "SELECT id, email, display_name, password_hash, is_admin, auth_provider FROM users WHERE email = $1",
    [trimmedEmail]
  );
  const row = rows[0];
  if (!row || !row.password_hash || !bcrypt.compareSync(pass, row.password_hash)) {
    if (row?.auth_provider === "microsoft" && !row.password_hash) {
      log.warn({ reason: "microsoft_account", email: maskEmail(trimmedEmail) }, "login failed");
      return res.status(401).json({
        error: "Esta cuenta usa Microsoft. Iniciá sesión con «Continuar con Microsoft».",
      });
    }
    log.warn({ reason: "invalid_credentials", email: maskEmail(trimmedEmail) }, "login failed");
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }

  const { rows: userRows } = await pool.query(
    "SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = $1",
    [row.id]
  );
  const user = userRows[0];
  const token = signToken(user);
  log.info({ userId: user.id, email: maskEmail(trimmedEmail) }, "user logged in");
  res.json({ token, user: userResponse(user) });
});

router.post("/microsoft", async (req, res) => {
  const idToken = String(req.body?.idToken || "").trim();
  if (!idToken) {
    return res.status(400).json({ error: "Falta el token de Microsoft." });
  }

  try {
    const claims = await verifyMicrosoftIdToken(idToken);
    const user = await findOrCreateMicrosoftUser(claims);
    const token = signToken(user);
    log.info({ userId: user.id, email: maskEmail(user.email), provider: "microsoft" }, "user logged in");
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    if (err.code === "NOT_CONFIGURED") {
      return res.status(503).json({ error: "Inicio de sesión con Microsoft no está configurado." });
    }
    if (err.code === "INVALID_TOKEN") {
      log.warn({ reason: "invalid_microsoft_token" }, "microsoft login failed");
      return res.status(401).json({ error: "Token de Microsoft inválido o expirado." });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const { rows } = await pool.query(
      "SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Usuario no encontrado." });
    res.json({ user: userResponse(user) });
  } catch {
    log.warn({ reason: "invalid_session" }, "auth me failed");
    return res.status(401).json({ error: "Sesión inválida." });
  }
});

module.exports = router;
