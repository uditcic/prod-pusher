@echo off
setlocal enableextensions

REM === Locate app (works from local or network share) ===
set "APP_HOME=%~dp0"

REM === Node runtime (portable first, else system) ===
set "NODE_BIN=%APP_HOME%node-v22\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"

REM === Per-user local logs (avoid write locks on a share) ===
set "PP_LOG_DIR=%LOCALAPPDATA%\prod-pusher\logs\%COMPUTERNAME%-%USERNAME%"
if not exist "%PP_LOG_DIR%" mkdir "%PP_LOG_DIR%" >nul 2>&1

REM === Defaults (edit as needed) ===
set "PORT=3000"
set "DEV_LOCAL_BASE=W:\"
set "IRCC_FTP_HOSTS=167.40.65.240,167.44.3.235"
set "IRCC_FTP_PORT=21"
set "IRCC_REMOTE_BASE=/cicnet/www_cicnet_gc_ca/"
set "CONNEXION_FTP_HOST=10.24.221.168"
set "CONNEXION_FTP_PORT=21"
set "CONNEXION_REMOTE_BASE=/cicintranet/"
set "CONNEXION_LOCAL_BASE=X:\"

REM --- Connexion default credentials (optional) ---
set "CONNEXION_FTP_USER=e-comm"
set "CONNEXION_FTP_PASS=pw34"

echo === Prod-Pusher launcher ===
echo Running from: %APP_HOME%
echo NODE_BIN=%NODE_BIN%
echo PORT=%PORT%
echo DEV_LOCAL_BASE=%DEV_LOCAL_BASE%
echo IRCC_FTP_HOSTS=%IRCC_FTP_HOSTS%  IRCC_REMOTE_BASE=%IRCC_REMOTE_BASE%
echo CONNEXION_FTP_HOST=%CONNEXION_FTP_HOST%  CONNEXION_REMOTE_BASE=%CONNEXION_REMOTE_BASE%
echo Logs: %PP_LOG_DIR%

REM --- If server already up, just open browser ---
powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -Uri ('http://localhost:%PORT%/api/health') -TimeoutSec 1; exit 0 } catch { exit 1 }"
if %errorlevel%==0 goto :open_browser

REM --- Start server in a new window (so this script continues) ---
pushd "%APP_HOME%"
start "Prod-Pusher Server" "%NODE_BIN%" "%APP_HOME%server\server.js"
popd

REM --- Wait until health is up (max ~20s), then open browser ---
powershell -NoProfile -Command ^
  "$u='http://localhost:%PORT%/api/health';" ^
  "for($i=0;$i -lt 40;$i++){" ^
  "  try{ if((Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 1).StatusCode -eq 200){ break } }catch{}" ^
  "  Start-Sleep -Milliseconds 500" ^
  "}"

:open_browser
start "" "http://localhost:%PORT%/"

REM (no pause needed; this window can close)
exit /b
