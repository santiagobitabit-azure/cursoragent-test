const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, JWT_SECRET } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

const router = express.Router();

const insertUser = db.prepare(
  "INSERT INTO users (email, display_name, password_hash, is_admin) VALUES (?, ?, ?, 0)"
);
const findByEmail = db.prepare(
  "SELECT id, email, display_name, password_hash, is_admin FROM users WHERE email = ? COLLATE NOCASE"
);
const findById = db.prepare(
  "SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?"
);

function userResponse(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: !!row.is_admin,
  };
}

router.post("/register", (req, res) => {
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
    const result = insertUser.run(trimmedEmail, name, hash);
    const user = findById.get(result.lastInsertRowid);
    const token = signToken(user);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
    }
    throw err;
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");

  const row = findByEmail.get(trimmedEmail);
  if (!row || !bcrypt.compareSync(pass, row.password_hash)) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }

  const user = findById.get(row.id);
  const token = signToken(user);
  res.json({ token, user: userResponse(user) });
});

router.get("/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = findById.get(payload.sub);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado." });
    res.json({ user: userResponse(user) });
  } catch {
    return res.status(401).json({ error: "Sesión inválida." });
  }
});

module.exports = router;
