# Prod-Pusher

Portable Node.js desktop tool for publishing content to IRCC production servers via FTP. Handles both external (canada.ca) and internal (Connexion intranet) publishing with developer lock checking, preflight validation, and per-user logging.

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

Produces `dist/Prod-Pusher.exe` (Node 22, Windows x64) with embedded icon.

## Workflows

### External Publishing (canada.ca)

Upload staging pages to the live IRCC website across two data centers (Barrie + Gatineau).

1. Enter your FTP credentials and paste staging URLs
2. Preflight lock check scans for VBScript `coder`/`task` markers
3. Files resolved from local `Z:\` drive, validated for existence
4. Uploaded to both FTP hosts in parallel
5. Optionally convert staging URLs to live `ircc.canada.ca` URLs

### Internal Publishing (Connexion)

Upload staging pages to the live Connexion intranet server.

1. Enter your FTP credentials and paste staging URLs
2. Same lock check and preflight validation
3. Files resolved from local `Y:\` drive
4. Uploaded to single Connexion FTP host

### Promote (W:\ to Z:\)

Copy files from the working drive to the staging drive, preserving relative paths.

### Resolve (Path Preview)

Debug helper that shows computed `W:\` and `Z:\` paths for given URLs and checks whether the files exist locally.

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Server status and configuration |
| GET | `/api/update-check` | Check GitHub for newer releases |
| POST | `/api/check/locks` | Preflight lock scan (external) |
| POST | `/api/check/locks-internal` | Preflight lock scan (internal) |
| POST | `/api/go-live/external` | Publish to canada.ca FTP servers |
| POST | `/api/go-live/internal` | Publish to Connexion FTP server |
| POST | `/api/diagnose/external` | Test FTP connectivity |
| POST | `/api/promote` | Copy files from W:\ to Z:\ |
| POST | `/api/resolve` | Preview resolved file paths |

## Configuration

All settings are configurable via environment variables. Defaults are set in `launch.bat` and `server/server.js`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `DEV_LOCAL_BASE` | `Z:\` | Local source for external uploads |
| `CONNEXION_LOCAL_BASE` | `Y:\` | Local source for internal uploads |
| `IRCC_FTP_HOSTS` | 167.40.65.240,167.44.3.235 | External FTP hosts (CSV) |
| `IRCC_FTP_PORT` | 21 | External FTP port |
| `IRCC_REMOTE_BASE` | /cicnet/www_cicnet_gc_ca/ | External remote path |
| `CONNEXION_FTP_HOST` | 10.24.221.168 | Internal FTP host |
| `CONNEXION_FTP_PORT` | 21 | Internal FTP port |
| `CONNEXION_REMOTE_BASE` | /cicintranet/ | Internal remote path |
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
├── promote/
│   ├── index.html          File promotion UI
│   └── promote.js
├── resolve/
│   ├── index.html          Path resolution UI
│   └── resolve.js
├── server/
│   ├── server.js           Express app (main)
│   ├── ftpclient.js        FTP push helper
│   └── promote.js          File copy helper
├── assets/
│   ├── icon.ico            App icon
│   └── includes.js         Dynamic footer loader
├── includes/
│   └── footer.html         Shared footer
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

It also follows Classic ASP `<!--#include-->` directives to check header files. Locked pages require explicit user confirmation (`force`) to publish.

## Logging

Daily log files are written to `PP_LOG_DIR` in JSON format:

```
%LOCALAPPDATA%\prod-pusher\logs\WORKSTATION-jsmith\app-20260312.log
```

Passwords are masked as `***` in all log entries.

## License

MIT
