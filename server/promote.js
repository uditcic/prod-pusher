const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

function norm(p) { return path.normalize(p); }

/**
 * Copy local files using mapping rules, e.g. { from: "W:\\", to: "Z:\\" }.
 */
async function promoteFiles({ mappings = [], files = [] }) {
  const results = [];
  for (const abs of files) {
    try {
      const absNorm = norm(abs);
      const match = mappings.find(m => absNorm.toLowerCase().startsWith(norm(m.from).toLowerCase()));
      if (!match) { results.push({ file: abs, status: "skipped", error: "No mapping matched" }); continue; }

      const rel = absNorm.slice(norm(match.from).length).replace(/^([\\/])/, "");
      const dest = norm(path.join(match.to, rel));
      const destDir = path.dirname(dest);

      await fsp.mkdir(destDir, { recursive: true });
      await fsp.copyFile(absNorm, dest);
      results.push({ file: abs, dest, status: "ok" });
    } catch (e) {
      results.push({ file: abs, status: "error", error: String(e.message || e) });
    }
  }
  return results;
}

module.exports = { promoteFiles };
