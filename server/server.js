// server/server.js
// Prod-Pusher API: External (canada.ca) + Internal (Connexion) + lock checks + logging + diagnose
process.noDeprecation = true;

const posix = require("path").posix;
const toPosix = p => String(p).replace(/\\/g, "/");

const path = require("path");
const fs = require("fs");
const { exec, spawn } = require("child_process");

function openBrowser(port) {
  const url = `http://localhost:${port}/`;

  // Try to launch Edge in app mode (standalone window, no tabs/address bar)
  const edgePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const edge = edgePaths.find(p => fs.existsSync(p));

  if (edge) {
    spawn(edge, [`--app=${url}`, "--no-first-run", "--disable-extensions"], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    // Fallback: open in default browser as a regular tab
    exec(`cmd /c start "" "${url}"`, { shell: false });
  }
}

// Load modules from portable Node bundle (skip when running as a pkg exe)
if (!process.pkg) {
  process.env.NODE_PATH = path.join(__dirname, "../node-v22/node_modules");
  require("module").Module._initPaths();
}

const express = require("express");

// Try both casings for your helper (some repos used ftpClient.js vs ftpclient.js)
let pushFiles;
try { ({ pushFiles } = require("./ftpClient")); } catch { ({ pushFiles } = require("./ftpclient")); }

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, "..")));
app.use(express.json({ limit: "2mb" }));

// ---------- Configuration (env overridable) ----------
const CFG = {
  // Local base to read files from
  DEV_LOCAL_BASE: process.env.DEV_LOCAL_BASE || "Z:\\",

  // External: IRCC canada.ca live (Barrie + Gatineau)
  IRCC_FTP_HOSTS: (process.env.IRCC_FTP_HOSTS || "167.40.65.240,167.44.3.235")
    .split(",").map(s => s.trim()).filter(Boolean),
  IRCC_FTP_PORT: Number(process.env.IRCC_FTP_PORT || 21),
  IRCC_REMOTE_BASE: process.env.IRCC_REMOTE_BASE || "/cicnet/www_cicnet_gc_ca/",
  IRCC_FTPS: process.env.IRCC_FTPS === "1", // optional explicit FTPS (TLS)

  // Internal: Connexion live
  CONNEXION_FTP_HOST: process.env.CONNEXION_FTP_HOST || "10.24.221.168",
  CONNEXION_FTP_PORT: Number(process.env.CONNEXION_FTP_PORT || 21),
  CONNEXION_REMOTE_BASE: process.env.CONNEXION_REMOTE_BASE || "/cicintranet/",
  CONNEXION_LOCAL_BASE: process.env.CONNEXION_LOCAL_BASE || "Y:\\",
  // If Connexion ever needs TLS, add CONNEXION_FTPS=1 and flip below where we call pushFiles
  CONNEXION_FTPS: process.env.CONNEXION_FTPS === "1",
};

// ---------- Minimal daily log (file + console) ----------
// OLD:
// const LOG_DIR = path.join(__dirname, "..", "logs");
// NEW:
const LOG_DIR = process.env.PP_LOG_DIR ||
  (process.pkg
    ? path.join(path.dirname(process.execPath), "logs")
    : path.join(__dirname, "..", "logs"));
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
const logPath = () =>
  path.join(LOG_DIR, `app-${new Date().toISOString().slice(0,10).replace(/-/g,"")}.log`);
function slog(event, detail = {}) {
  const safe = { ...detail };
  if (safe.password) safe.password = "***";
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...safe }) + "\n";
  try { fs.appendFileSync(logPath(), line); } catch {}
  console.log(line.trim());
}

// ---------- Helpers ----------

// === Ensure remote directories exist (per file) ===
const ftp = require("basic-ftp");

async function ensureRemoteDirs({ host, port, user, password, remoteBase = "/", rels = [], ftps = false }) {
  const client = new ftp.Client(15000);
  try {
    await client.access({
      host, port, user, password,
      secure: ftps,
      secureOptions: { rejectUnauthorized: false },
    });

    for (const r of rels) {
      const remoteRel  = toPosix(r).replace(/^\/+/, "");
      const remoteFull = posix.join(remoteBase || "/", remoteRel);
      const remoteDir  = posix.dirname(remoteFull);
      try {
        await client.ensureDir(remoteDir);
      } catch (e) {
        // let pushFiles surface any remaining errors; this keeps preflight light
      }
    }
  } finally {
    client.close();
  }
}

/** Convert a URL or path to a safe relative path (Windows backslashes) */
function relFromInput(s) {
  let rel = String(s || "");
  try {
    const u = new URL(rel);
    rel = decodeURIComponent(u.pathname || "/");
  } catch { /* not a URL */ }
  rel = rel.replace(/\\/g, "/");
  if (rel.startsWith("/")) rel = rel.slice(1);
  // remove .. segments
  rel = rel.replace(/(^|\/)\.\.(?=\/|$)/g, "");
  // folder → index.html
  if (!rel || /\/$/.test(rel)) rel += "index.html";
  return rel.replace(/\//g, "\\");
}

/** Return a list of absolute paths that do NOT exist under base */
function missingUnderBase(base, rels) {
  return rels.map(r => path.join(base, r)).filter(abs => !fs.existsSync(abs));
}

// ---------- LOCK CHECK HELPERS (Classic ASP / header include flags) ----------
function readText(absPath) {
  try { return fs.readFileSync(absPath, "utf8"); } catch { return null; }
}

// Extract coder/task from VBScript-like lines, skip comments starting with ' or Rem
function extractCoderTaskFromText(txt) {
  if (!txt) return null;
  const lines = txt.split(/\r?\n/);
  let coder = null, task = null;
  for (let raw of lines) {
    const ln = raw.trim(); if (!ln) continue;
    const lc = ln.toLowerCase();
    if (lc.startsWith("'") || lc.startsWith("rem ")) continue;
    let m = ln.match(/\bcoder\s*=\s*"([^"]*)"/i); if (m) coder = m[1];
    m = ln.match(/\btask\s*=\s*"([^"]*)"/i); if (m) task = m[1];
    if (coder !== null && task !== null) break;
  }
  if (coder !== null || task !== null) {
    const c = (coder || "").trim();
    const t = (task || "").trim();
    return { coder: c, task: t, locked: c.length > 0 };
  }
  return null;
}

function findLikelyHeaderIncludes(txt) {
  if (!txt) return [];
  const incs = [];
  const re = /<!--#include\s+(?:file|virtual)\s*=\s*"([^"]+)"\s*-->/ig;
  let m;
  while ((m = re.exec(txt))) {
    const inc = m[1];
    if (/header|masthead|include/i.test(inc)) incs.push(inc);
  }
  return incs;
}

function resolveIncludeAbs(base, fileAbs, includePath) {
  const incNorm = includePath.replace(/\\/g, "/");
  if (incNorm.startsWith("/")) return path.join(base, incNorm.replace(/\//g, "\\"));
  return path.join(path.dirname(fileAbs), incNorm.replace(/\//g, "\\"));
}

function checkLockForFile(base, relPath) {
  const abs = path.join(base, relPath);
  const txt = readText(abs);
  // 1) page itself
  const pageMeta = extractCoderTaskFromText(txt);
  if (pageMeta && pageMeta.locked) return { rel: relPath, abs, source: "file", ...pageMeta };
  // 2) header includes
  const includes = findLikelyHeaderIncludes(txt || "");
  for (const inc of includes.slice(0, 3)) {
    const incAbs = resolveIncludeAbs(base, abs, inc);
    const incTxt = readText(incAbs);
    const meta = extractCoderTaskFromText(incTxt);
    if (meta && meta.locked) {
      return { rel: relPath, abs, source: "include", includePath: inc, includeAbs: incAbs, ...meta };
    }
  }
  if (pageMeta) return { rel: relPath, abs, source: "file", ...pageMeta, locked: false };
  return null;
}

function collectLocks(base, rels) {
  const out = [];
  for (const r of rels) {
    const info = checkLockForFile(base, r);
    if (info && info.locked) out.push(info);
  }
  return out;
}

// ---------- Update check (exe only; cached per session) ----------
const CURRENT_VERSION = require("../package.json").version;
let _updateCache = null;

/** Fetch JSON from a URL, respecting HTTP(S)_PROXY env vars + timeout. */
function fetchJSON(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

    let req;
    if (proxyUrl) {
      // Tunnel through corporate proxy via HTTP CONNECT
      const http = require("http");
      const proxy = new URL(proxyUrl);
      const connectReq = http.request({
        host: proxy.hostname,
        port: proxy.port || 8080,
        method: "CONNECT",
        path: `${parsed.hostname}:443`,
      });
      connectReq.setTimeout(timeoutMs, () => { connectReq.destroy(); reject(new Error("proxy timeout")); });
      connectReq.on("error", reject);
      connectReq.on("connect", (_res, socket) => {
        const https = require("https");
        req = https.get({
          socket, hostname: parsed.hostname, path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "prod-pusher-app" },
        }, handleResponse);
        req.on("error", reject);
      });
      connectReq.end();
    } else {
      const https = require("https");
      req = https.get({
        hostname: parsed.hostname, path: parsed.pathname + parsed.search,
        headers: { "User-Agent": "prod-pusher-app" },
      }, handleResponse);
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("timeout")); });
      req.on("error", reject);
    }

    function handleResponse(r) {
      let body = "";
      r.on("data", (c) => (body += c));
      r.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }
  });
}

app.get("/api/update-check", async (req, res) => {
  if (!process.pkg) return res.json({ updateAvailable: false });
  if (_updateCache) return res.json(_updateCache);

  try {
    const data = await fetchJSON(
      "https://api.github.com/repos/uditcic/prod-pusher/releases/latest"
    );

    const latestTag = (data.tag_name || "").replace(/^v/, "");
    const updateAvailable = latestTag && latestTag !== CURRENT_VERSION;
    _updateCache = {
      updateAvailable,
      currentVersion: CURRENT_VERSION,
      latestVersion: latestTag || CURRENT_VERSION,
      releaseUrl: data.html_url || "",
    };
    res.json(_updateCache);
  } catch {
    res.json({ updateAvailable: false });
  }
});

// ---------- Health ----------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    defaults: {
      DEV_LOCAL_BASE: CFG.DEV_LOCAL_BASE,
      IRCC_FTP_HOSTS: CFG.IRCC_FTP_HOSTS,
      IRCC_FTP_PORT: CFG.IRCC_FTP_PORT,
      IRCC_REMOTE_BASE: CFG.IRCC_REMOTE_BASE,
      CONNEXION_FTP_HOST: CFG.CONNEXION_FTP_HOST,
      CONNEXION_FTP_PORT: CFG.CONNEXION_FTP_PORT,
      CONNEXION_REMOTE_BASE: CFG.CONNEXION_REMOTE_BASE,
      CONNEXION_LOCAL_BASE: CFG.CONNEXION_LOCAL_BASE,
      IRCC_FTPS: CFG.IRCC_FTPS,
      CONNEXION_FTPS: CFG.CONNEXION_FTPS
    },
  });
});

// ---------- Check locks (External preflight; no upload) ----------
app.post("/api/check/locks", (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const rels = urls.map(relFromInput);
  const base = CFG.DEV_LOCAL_BASE;

  const inspected = [];
  const locked = [];
  for (const r of rels) {
    const info = checkLockForFile(base, r);
    if (info) {
      inspected.push({ rel: r, source: info.source, coder: info.coder, task: info.task, locked: !!info.locked });
      if (info.locked) locked.push({ rel: r, coder: info.coder, task: info.task, source: info.source });
    } else {
      inspected.push({ rel: r, source: "none", locked: false });
    }
  }
  res.json({ ok: true, locked, inspectedCount: inspected.length, inspected });
});

// ---------- Check locks (Connexion preflight; no upload) ----------
app.post("/api/check/locks-internal", (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const rels = urls.map(relFromInput);
  const base = CFG.CONNEXION_LOCAL_BASE;

  const inspected = [];
  const locked = [];
  for (const r of rels) {
    const info = checkLockForFile(base, r);
    if (info) {
      inspected.push({ rel: r, source: info.source, coder: info.coder, task: info.task, locked: !!info.locked });
      if (info.locked) locked.push({ rel: r, coder: info.coder, task: info.task, source: info.source });
    } else {
      inspected.push({ rel: r, source: "none", locked: false });
    }
  }
  res.json({ ok: true, locked, inspectedCount: inspected.length, inspected });
});

// ---------- External (canada.ca) ----------
app.post("/api/go-live/external", async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const username = (req.body?.username || process.env.IRCC_FTP_USER || "").trim();
    const password = req.body?.password ?? process.env.IRCC_FTP_PASS;
    const force = !!req.body?.force;

    slog("external.start", { urls, username, force });

    if (!urls.length || !username || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Missing parameters (urls/username/password)." });
    }

    const rels = urls.map(relFromInput);
    const base = CFG.DEV_LOCAL_BASE;

    const missing = missingUnderBase(base, rels);
    slog("external.resolve", { base, rels, missingCount: missing.length });
    if (missing.length) {
      slog("external.missing", { missing });
      return res.status(400).json({ success: false, error: "Some files were not found locally.", missingFiles: missing });
    }

    // --- Lock gate (block unless force:true) ---
    const locks = collectLocks(base, rels);
    if (locks.length && !force) {
      slog("external.locks.block", { count: locks.length, locks: locks.map(l => ({ rel: l.rel, coder: l.coder, task: l.task, src: l.source })) });
      return res.status(409).json({ success: false, error: "Locked pages detected. Ask the coder to clear 'coder' or proceed with force:true.", locks });
    }
    if (locks.length && force) slog("external.locks.force", { count: locks.length });

    const hostSummaries = [];
    for (const host of CFG.IRCC_FTP_HOSTS) {
      try {
        slog("external.ftp.connect", { host, port: CFG.IRCC_FTP_PORT, remoteBase: CFG.IRCC_REMOTE_BASE, count: rels.length, ftps: CFG.IRCC_FTPS });
await ensureRemoteDirs({
  host,
  port: CFG.IRCC_FTP_PORT,
  user: username,
  password,
  remoteBase: CFG.IRCC_REMOTE_BASE,
  rels,
  ftps: CFG.IRCC_FTPS,
});

          
        const result = await pushFiles({
          type: "external",
          host,
          user: username,
          password,
          port: CFG.IRCC_FTP_PORT,
          localDir: base,
          remoteDir: CFG.IRCC_REMOTE_BASE,
          fileList: rels,
          ftps: CFG.IRCC_FTPS,
        });

        let ok = 0, err = 0, note;
        if (Array.isArray(result)) {
          ok = result.filter(x => x && x.status === "ok").length;
          err = result.filter(x => x && x.status === "error").length;
        } else if (result && typeof result === "object") {
          if (Number.isInteger(result.ok)) { ok = result.ok; err = Number(result.err) || 0; }
          else { ok = rels.length; err = 0; note = "ftpclient returned object w/o ok/err"; }
        } else {
          ok = rels.length; err = 0; note = "ftpclient returned no per-file results";
        }

        hostSummaries.push({ host, port: CFG.IRCC_FTP_PORT, ok, err, note });
        slog("external.ftp.done", { host, ok, err, note });
      } catch (e) {
        const msg = String(e?.message || e);
        hostSummaries.push({ host, port: CFG.IRCC_FTP_PORT, ok: 0, err: rels.length, error: msg });
        slog("external.ftp.error", { host, error: msg });
      }
    }

    const totalOk = hostSummaries.reduce((a, b) => a + (b.ok || 0), 0);
    const totalErr = hostSummaries.reduce((a, b) => a + (b.err || 0), 0);
    slog("external.end", { hosts: hostSummaries, totalOk, totalErr });

    const message = totalErr
      ? `Completed with errors. Uploaded ${totalOk} item(s) across ${CFG.IRCC_FTP_HOSTS.length} host(s).`
      : `Uploaded ${totalOk} item(s) to ${CFG.IRCC_FTP_HOSTS.length} host(s).`;

    res.json({ success: true, message, results: { hosts: hostSummaries, locks } });
  } catch (e) {
    const msg = String(e?.message || e);
    slog("external.crash", { error: msg });
    res.status(500).json({ success: false, error: msg });
  }
});

// ---------- Internal (Connexion) ----------
app.post("/api/go-live/internal", async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];

    const username = (req.body?.username || "").trim();
    const password = req.body?.password ?? "";
    const force = !!req.body?.force;

    slog("internal.start", { urls, username, force });

    if (!urls.length || !username || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Missing parameters (urls/username/password)." });
    }

    const rels = urls.map(relFromInput);
    const base = CFG.CONNEXION_LOCAL_BASE;

    const missing = missingUnderBase(base, rels);
    slog("internal.resolve", { base, rels, missingCount: missing.length });
    if (missing.length) {
      slog("internal.missing", { missing });
      return res.status(400).json({ success: false, error: "Some files were not found locally.", missingFiles: missing });
    }

    // --- Lock gate for Connexion (same behavior as External) ---
    const locks = collectLocks(base, rels);
    if (locks.length && !force) {
      slog("internal.locks.block", { count: locks.length, locks: locks.map(l => ({ rel: l.rel, coder: l.coder, task: l.task, src: l.source })) });
      return res.status(409).json({
        success: false,
        error: "Locked pages detected. Ask the coder to clear 'coder' or proceed with force:true.",
        locks
      });
    }
    if (locks.length && force) slog("internal.locks.force", { count: locks.length });
await ensureRemoteDirs({
  host: CFG.CONNEXION_FTP_HOST,
  port: CFG.CONNEXION_FTP_PORT,
  user: username,
  password,
  remoteBase: CFG.CONNEXION_REMOTE_BASE,
  rels,
  ftps: CFG.CONNEXION_FTPS,
});

    try {
      const result = await pushFiles({
        type: "internal",
        host: CFG.CONNEXION_FTP_HOST,
        user: username,
        password,
        port: CFG.CONNEXION_FTP_PORT,
        localDir: base,
        remoteDir: CFG.CONNEXION_REMOTE_BASE,
        fileList: rels,
        ftps: CFG.CONNEXION_FTPS, // stays false unless you set CONNEXION_FTPS=1
      });

      let ok = 0, err = 0, note;
      if (Array.isArray(result)) {
        ok = result.filter(x => x && x.status === "ok").length;
        err = result.filter(x => x && x.status === "error").length;
      } else if (result && typeof result === "object") {
        if (Number.isInteger(result.ok)) { ok = result.ok; err = Number(result.err) || 0; }
        else { ok = rels.length; err = 0; note = "ftpclient returned object w/o ok/err"; }
      } else {
        ok = rels.length; err = 0; note = "ftpclient returned no per-file results";
      }

      slog("internal.ftp.done", { host: CFG.CONNEXION_FTP_HOST, ok, err, note });
      res.json({
        success: true,
        message: `Uploaded ${ok} item(s) to Connexion.`,
        results: { host: CFG.CONNEXION_FTP_HOST, ok, err, note, locks }
      });
    } catch (e) {
      const msg = String(e?.message || e);
      slog("internal.ftp.error", { host: CFG.CONNEXION_FTP_HOST, error: msg });
      res.status(500).json({ success: false, error: msg });
    }
  } catch (e) {
    const msg = String(e?.message || e);
    slog("internal.crash", { error: msg });
    res.status(500).json({ success: false, error: msg });
  }
});

// ---------- Diagnose login only (external; no upload) ----------
app.post("/api/diagnose/external", async (req, res) => {
  const ftp = require("basic-ftp");
  const { username = process.env.IRCC_FTP_USER || "", password = process.env.IRCC_FTP_PASS } = req.body || {};
  const out = [];
  for (const host of CFG.IRCC_FTP_HOSTS) {
    const client = new ftp.Client(15000);
    client.ftp.verbose = true;
    try {
      await client.access({
        host,
        port: CFG.IRCC_FTP_PORT,
        user: username,
        password,
        secure: CFG.IRCC_FTPS,
        secureOptions: { rejectUnauthorized: false },
      });
      const pwd = await client.pwd();
      try {
        await client.ensureDir(CFG.IRCC_REMOTE_BASE || "/");
        out.push({ host, ok: true, pwd, remoteBase: CFG.IRCC_REMOTE_BASE });
      } catch (e) {
        out.push({ host, ok: false, stage: "ensureDir", error: String(e?.message || e) });
      }
    } catch (e) {
      out.push({ host, ok: false, stage: "connect/login", error: String(e?.message || e) });
    } finally { client.close(); }
  }
  slog("external.diagnose", { out });
  res.json({ ok: out.every(x => x.ok), results: out });
});

// ---------- Start ----------
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (process.pkg) openBrowser(PORT);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} already in use — opening browser.`);
    openBrowser(PORT);
    process.exit(0);
  } else {
    throw err;
  }
});
