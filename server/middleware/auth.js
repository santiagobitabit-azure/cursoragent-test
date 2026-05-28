const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "mundial-2026-dev-secret-change-in-production";

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, isAdmin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function attachUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Iniciá sesión para continuar." });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const row = db
      .prepare("SELECT id, email, display_name, is_admin FROM users WHERE id = ?")
      .get(payload.sub);
    if (!row) return res.status(401).json({ error: "Usuario no encontrado." });
    req.userId = row.id;
    req.user = row;
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

function requireAuth(req, res, next) {
  attachUser(req, res, next);
}

function requireAdmin(req, res, next) {
  attachUser(req, res, (err) => {
    if (err) return;
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Acceso solo para administradores." });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireAdmin, JWT_SECRET };
