require("./env");
const pino = require("pino");

const isProduction = process.env.NODE_ENV === "production";
const usePretty =
  process.env.LOG_PRETTY === "true" || (!isProduction && process.env.LOG_PRETTY !== "false");

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(usePretty
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
  base: { service: "mundial-2026", env: process.env.NODE_ENV || "development" },
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "token",
      "password_hash",
      "*.password",
      "*.token",
    ],
    remove: true,
  },
});

function maskEmail(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

module.exports = logger;
module.exports.maskEmail = maskEmail;
