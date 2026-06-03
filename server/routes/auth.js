const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { signToken, JWT_SECRET } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

const router = express.Router();

function userResponse(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: !!row.is_admin,
  };
}

router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body || {};
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const name = String(displayName || "").trim();
  const pass = String(password || "");

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: "Ingresá un email válido." });
  }
  if (name.length < 2) {
    return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres." });
  }
  if (pass.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const hash = bcrypt.hashSync(pass, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash, is_admin)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, email, display_name, is_admin, created_at`,
      [trimmedEmail, name, hash]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    if (err.code === "23505") {
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
    "SELECT id, email, display_name, password_hash, is_admin FROM users WHERE email = $1",
    [trimmedEmail]
  );
  const row = rows[0];
  if (!row || !bcrypt.compareSync(pass, row.password_hash)) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }

  const { rows: userRows } = await pool.query(
    "SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = $1",
    [row.id]
  );
  const user = userRows[0];
  const token = signToken(user);
  res.json({ token, user: userResponse(user) });
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
    return res.status(401).json({ error: "Sesión inválida." });
  }
});

module.exports = router;
