const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "mundial-2026-dev-secret-change-in-production";

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Iniciá sesión para continuar." });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
