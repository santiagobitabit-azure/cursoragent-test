const fs = require("fs");
const path = require("path");

let cached = null;

function loadMatches() {
  if (cached) return cached;
  const content = fs.readFileSync(
    path.join(__dirname, "..", "fixture-data.js"),
    "utf8"
  );
  const marker = "const GROUP_STAGE_MATCHES = ";
  const start = content.indexOf(marker) + marker.length;
  let depth = 0;
  let end = start;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "[") depth++;
    else if (content[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const matches = JSON.parse(content.slice(start, end));
  const byId = Object.fromEntries(matches.map((m) => [m.id, m]));
  cached = { matches, byId, ids: new Set(matches.map((m) => m.id)) };
  return cached;
}

module.exports = { loadMatches };
