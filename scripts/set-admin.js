#!/usr/bin/env node
/**
 * Promueve o revoca administrador en la base de datos.
 * Uso: node scripts/set-admin.js <email> [--revoke]
 */
const db = require("../server/db");

const email = String(process.argv[2] || "").trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Uso: node scripts/set-admin.js <email> [--revoke]");
  process.exit(1);
}

const row = db
  .prepare("SELECT id, email, display_name, is_admin FROM users WHERE email = ? COLLATE NOCASE")
  .get(email);

if (!row) {
  console.error(`No existe un usuario con email: ${email}`);
  process.exit(1);
}

const isAdmin = revoke ? 0 : 1;
db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(isAdmin, row.id);

const action = revoke ? "revocado" : "otorgado";
console.log(`Admin ${action} para ${row.email} (${row.display_name}).`);
