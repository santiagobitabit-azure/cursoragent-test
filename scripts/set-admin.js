#!/usr/bin/env node
/**
 * Promueve o revoca administrador en la base de datos.
 * Uso: node scripts/set-admin.js <email> [--revoke]
 */
const { pool, init } = require("../server/db");

const email = String(process.argv[2] || "").trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

async function main() {
  await init();

  if (!email) {
    console.error("Uso: node scripts/set-admin.js <email> [--revoke]");
    process.exit(1);
  }

  const { rows } = await pool.query(
    "SELECT id, email, display_name, is_admin FROM users WHERE email = $1",
    [email]
  );
  const row = rows[0];

  if (!row) {
    console.error(`No existe un usuario con email: ${email}`);
    process.exit(1);
  }

  const isAdmin = !revoke;
  await pool.query("UPDATE users SET is_admin = $1 WHERE id = $2", [isAdmin, row.id]);

  const action = revoke ? "revocado" : "otorgado";
  console.log(`Admin ${action} para ${row.email} (${row.display_name}).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
