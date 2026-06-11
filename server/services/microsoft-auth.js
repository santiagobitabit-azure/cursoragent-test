const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const JWKS_TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, { keys: object[], fetchedAt: number }>} */
const jwksCache = new Map();

function isConfigured() {
  return Boolean(CLIENT_ID);
}

function getPublicConfig() {
  if (!CLIENT_ID) return null;
  const tenant = process.env.AZURE_TENANT_ID || "common";
  return {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${tenant}`,
  };
}

async function fetchJwks(issuer) {
  const normalized = issuer.replace(/\/v2\.0\/?$/, "");
  const jwksUri = `${normalized}/discovery/v2.0/keys`;
  const res = await fetch(jwksUri);
  if (!res.ok) {
    const err = new Error("Could not fetch Microsoft signing keys.");
    err.code = "INVALID_TOKEN";
    throw err;
  }
  const body = await res.json();
  const entry = { keys: body.keys || [], fetchedAt: Date.now() };
  jwksCache.set(jwksUri, entry);
  return entry;
}

async function getSigningKey(issuer, kid) {
  const normalized = issuer.replace(/\/v2\.0\/?$/, "");
  const jwksUri = `${normalized}/discovery/v2.0/keys`;
  const cached = jwksCache.get(jwksUri);
  const stale = !cached || Date.now() - cached.fetchedAt > JWKS_TTL_MS;
  const jwks = stale ? await fetchJwks(issuer) : cached;

  let jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) {
    const refreshed = await fetchJwks(issuer);
    jwk = refreshed.keys.find((key) => key.kid === kid);
  }

  if (!jwk) {
    const err = new Error("Microsoft signing key not found.");
    err.code = "INVALID_TOKEN";
    throw err;
  }

  return crypto.createPublicKey({ key: jwk, format: "jwk" });
}

async function verifyMicrosoftIdToken(idToken) {
  if (!CLIENT_ID) {
    const err = new Error("Microsoft login is not configured.");
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid || !decoded.payload?.iss) {
    const err = new Error("Invalid Microsoft token.");
    err.code = "INVALID_TOKEN";
    throw err;
  }

  const issuer = decoded.payload.iss;
  const publicKey = await getSigningKey(issuer, decoded.header.kid);
  const payload = jwt.verify(idToken, publicKey, {
    audience: CLIENT_ID,
    issuer,
    algorithms: ["RS256"],
  });

  const email = String(payload.email || payload.preferred_username || "")
    .trim()
    .toLowerCase();
  const name = String(
    payload.name || payload.preferred_username || email.split("@")[0] || "Usuario"
  ).trim();
  const oid = payload.oid;

  if (!oid) {
    const err = new Error("Microsoft token missing user identifier.");
    err.code = "INVALID_TOKEN";
    throw err;
  }

  return { oid, email, name };
}

module.exports = {
  isConfigured,
  getPublicConfig,
  verifyMicrosoftIdToken,
};
