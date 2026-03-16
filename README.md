# Prod-Pusher

Portable Node.js desktop tool for publishing web content to production servers via FTP. Handles both external and internal publishing with developer lock checking, preflight validation, dry run previews, and per-user logging.

## Quick Start

```bash
npm install
npm start
```

Or on Windows, double-click `launch.bat`. The app opens at `http://localhost:3000` in Edge app mode.

### Build Portable Executable

```bash
npm run build:exe
```

Produces `dist/Prod-Pusher.exe` (Node 22, Windows x64).

## Workflows

### External Publishing

Upload staging pages to the live external website across multiple data centers.

1. Enter your FTP credentials and paste staging URLs
2. Preflight lock check scans for VBScript `coder`/`task` markers
3. Files resolved from local `Z:\` drive, validated for existence
4. Uploaded to all configured FTP hosts in parallel
5. Optionally convert staging URLs to live URLs

### Internal Publishing

Upload staging pages to the live internal intranet server.

1. Enter your FTP credentials and paste staging URLs
2. Same lock check and preflight validation
3. Files resolved from local `Y:\` drive
4. Uploaded to configured internal FTP host

### Dry Run Mode

Both publishing workflows support a **Dry Run** option. Check the "Dry run (preview only)" box before publishing to:

- Validate all URLs and resolve local file paths
- Check for developer locks
- See which FTP hosts would be targeted
- **No files are uploaded** — safe for testing and verification

### Resolve (Path Preview)

Debug helper that shows computed local paths for given URLs and checks whether the files exist locally.

### Publish History

Browse past publish sessions from the **📋 Publish History** page on the control panel. Features include:

- Filterable by date range and environment (internal/external)
- Paginated session list with outcome badges (success, partial, dry run, crash, blocked)
- Expandable detail rows showing the full event timeline for each session
- Data sourced from the JSON log files — no database needed

## UI Enhancements

- **URL counter** — Live count displayed below the URL textarea
- **Whitespace stripper** — Blank lines and leading/trailing spaces auto-cleaned on paste
- **Copy to clipboard** — One-click copy for converted live URLs
- **Confirmation modal** — Styled dialog showing file list before publishing (replaces browser `confirm()`)
- **Activity log drawer** — Real-time SSE-powered log stream at the bottom of publishing pages, color-coded by severity (green = success, red = error, yellow = locks, cyan = dry run)

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Server status, version, and configuration |
| GET | `/api/update-check` | Check for newer releases (raw GitHub + Releases API fallback) |
| POST | `/api/check/locks` | Preflight lock scan (external) |
| POST | `/api/check/locks-internal` | Preflight lock scan (internal) |
| POST | `/api/go-live/external` | Publish to external FTP servers (supports `dryRun` flag) |
| POST | `/api/go-live/internal` | Publish to internal FTP server (supports `dryRun` flag) |
| POST | `/api/diagnose/external` | Test FTP connectivity |
| POST | `/api/resolve` | Preview resolved file paths |
| GET | `/api/logs/stream` | Real-time log stream (SSE) |
| GET | `/api/logs/history` | Paginated publish session history (filterable by date, env) |
| GET | `/api/logs/history/:sessionId` | Full event detail for a single session |

## Configuration

All settings are configurable via environment variables. Set them in `launch.bat` or your shell before starting.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `DEV_LOCAL_BASE` | `Z:\` | Local source for external uploads |
| `CONNEXION_LOCAL_BASE` | `Y:\` | Local source for internal uploads |
| `IRCC_FTP_HOSTS` | *(none)* | External FTP hosts (comma-separated) |
| `IRCC_FTP_PORT` | 21 | External FTP port |
| `IRCC_REMOTE_BASE` | `/` | Remote path on external server |
| `CONNEXION_FTP_HOST` | *(none)* | Internal FTP host |
| `CONNEXION_FTP_PORT` | 21 | Internal FTP port |
| `CONNEXION_REMOTE_BASE` | `/` | Remote path on internal server |
| `IRCC_FTPS` | 0 | Set to `1` for TLS on external |
| `CONNEXION_FTPS` | 0 | Set to `1` for TLS on internal |
| `PP_LOG_DIR` | `%LOCALAPPDATA%\prod-pusher\logs\[PC]-[USER]` | Log directory |

## Project Structure

```
prod-pusher/
├── index.html              Main control panel
├── style.css               Global styles
├── launch.bat              Windows launcher
├── external/
│   ├── index.html          External publishing UI
│   └── external.js
├── internal/
│   ├── index.html          Internal publishing UI
│   └── internal.js
├── history/
│   ├── index.html          Publish history page
│   └── history.js          History fetch + render logic
├── resolve/
│   ├── index.html          Path resolution UI
│   └── resolve.js
├── server/
│   ├── server.js           Express app (API + SSE + history endpoints)
│   └── ftpclient.js        FTP push helper
├── assets/
│   ├── icon.ico            App icon
│   ├── includes.js         Dynamic footer loader (version from /api/health)
│   ├── log-drawer.js       Real-time activity log drawer (SSE)
│   ├── quick-wins.js       URL counter, whitespace strip, copy, confirm modal
│   └── lock-preflight.js   Shared lock-check logic
├── includes/
│   └── footer.html         Shared footer template (version + date placeholders)
├── scripts/
│   └── apply-icon.mjs      Post-build icon stamper
├── node-v22/               Portable Node.js runtime
└── dist/                   Build output
```

## Lock Detection

Before any upload, Prod-Pusher scans target files for VBScript lock markers:

```vbscript
coder = "John Smith"
task  = "JIRA-1234"
```

It also follows Classic ASP `<!--#include-->` directives to check header files. Locked pages require explicit user confirmation to publish.

## Logging

Daily log files are written to `PP_LOG_DIR` in JSON-lines format:

```
%LOCALAPPDATA%\prod-pusher\logs\WORKSTATION-jsmith\app-20260312.log
```

Passwords are masked as `***` in all log entries.

### Activity Log Drawer

The internal and external publishing pages include a bottom drawer that streams log events in real-time via Server-Sent Events (`/api/logs/stream`). The drawer auto-opens when a publish starts and color-codes entries by severity (green for success, red for errors, yellow for lock warnings, cyan for dry runs).

### Publish Session Parsing

Log entries are grouped into publish sessions using the event lifecycle:
- `.start` — begins a new session
- `.end` — successful completion (may include error counts for partial success)
- `.dryrun` — dry run completed (no uploads)
- `.crash` — unhandled error during publish
- `.locks.block` — publish blocked by developer locks
- `.missing` — file resolution failures

## Update Checker

When running as a packaged `.exe`, the app checks for newer versions on startup. It tries `raw.githubusercontent.com` first (works behind most VPNs), then falls back to the GitHub Releases API. A yellow banner appears on the control panel when an update is available.

## License

MIT
