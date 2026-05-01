# Prod-Pusher Changelog

## v3.5.2 (April 2026)

### Bug Fixes

#### 🐛 URL Parsing for Hostnames without Protocol
- Fixed an issue where pasting URLs missing a protocol (e.g., `stage.cic.gc.ca/path...`) caused the URL parser to fail, resulting in the hostname being incorrectly kept as part of the local file path.
- This resolves the "Some files were not found locally" error that occurred because the application was looking for a non-existent directory named after the domain.
- `relFromInput` now properly strips protocols and known domains (`*.gc.ca`, `*.canada.ca`) and uses a dummy base URL to cleanly extract the file path.

---

**Release Date:** April 30, 2026
**Author:** Udit Kumar

---

## v3.5.1 (April 2026)

### Bug Fixes

#### 🐛 Path Traversal False Positives on Drive Roots
- Fixed a bug where configuring a base directory as a bare drive root (e.g., `Y:\`) would cause `safeJoin` and `resolveIncludeAbs` to incorrectly flag valid paths as missing.
- Ensured trailing path separators are handled consistently when building the verification prefix.

---

**Release Date:** April 29, 2026
**Author:** Udit Kumar

---

## v3.5 (April 2026)

### Security Fixes

#### 🔒 Path Traversal Protection
- Added `safeJoin()` helper that uses `path.resolve()` and asserts the result stays inside the configured base directory
- Applied to all four path-joining call sites: `missingUnderBase`, `checkLockForFile`, `resolveIncludeAbs`, and the `/api/resolve` endpoint
- `resolveIncludeAbs` now returns `null` (instead of an escaped path) when an ASP `<!--#include-->` directive points outside the base — the lock check skips it safely

#### 🔒 PowerShell Injection Prevention
- `cleanupOldVersions` previously interpolated file paths into a PowerShell script string (single-quote escaped only — bypassable)
- File path is now passed entirely out-of-band via an environment variable (`_PP_CLEANUP_TARGET`) and read inside PowerShell as `$env:_PP_CLEANUP_TARGET` — no user-controlled data in the script string

#### 🔒 FTP Password No Longer Stored in sessionStorage
- Removed the "Remember password for this session" checkbox and its `sessionStorage.getItem/setItem` calls
- Password is now held in a module-scoped in-memory variable (`_sessionPass`) — invisible to Web Storage APIs, cleared automatically on page close or refresh, and inaccessible to other scripts on the same origin

### UI Improvements

#### 🎨 App Bar Redesign
- Replaced the "PROD-PUSHER" text label with the app icon image (`assets/icon.ico`) across all pages
- On sub-pages (Internal, External, History): Back button moved to the **left** side of the app bar; icon sits on the right
- On the home (Control Panel) page: icon on the left, version number on the right
- Added `.app-bar__logo` CSS class (28×28px, `border-radius: 4px`) to size and round the icon consistently

---

**Release Date:** April 28, 2026
**Author:** Udit Kumar

---

## v3.2 (March 2026)

### Improvements

#### 🧹 Smarter Auto-Cleanup
- Now scans Desktop, Downloads, and Documents in addition to the exe's own directory — old versions are found regardless of where the user put them
- Before deleting a locked file, the old process is stopped first via PowerShell (`Stop-Process`), then the file is removed — no more leftover exes when both versions are open at the same time
- Full path comparison when filtering candidates prevents accidentally matching the currently running exe

---

**Release Date:** March 31, 2026
**Author:** Udit Kumar

---

## v3.1 (March 2026)

### New Features

#### 🧹 Auto-Cleanup Old Versions
- Automatically deletes previous Prod-Pusher exe files when launching a new release
- Scans exe directory on startup for old `prod-pusher*.exe` files
- Direct deletion for unlocked files, falls back to delayed PowerShell delete for locked files
- Works even when old version is still running (waits for process to release file)
- All cleanup actions logged to `logs/app-*.log` with `cleanup.*` events

### UI/UX Improvements

#### 🖥️ App Shell Layout
- New sticky app bar at the top of every page with `PROD-PUSHER` branding
- Control panel shows version number in the app bar (fetched from health API)
- Sub-pages (internal, external, history) include a `← Back` navigation link
- Body layout changed from centered floating card to top-down app flow with proper top padding
- Container widened and repositioned for a desktop-app feel

#### 🎯 Custom Favicon
- All pages now use the Prod-Pusher icon (`assets/icon.ico`) as the browser/taskbar favicon
- Matches the exe icon for consistent branding across taskbar and browser tabs

### Bug Fixes

- **Fixed publish history logging**: Internal publish route now correctly logs `internal.end` events for successful and failed uploads, ensuring history page shows accurate outcomes instead of "incomplete"

---

**Release Date:** March 31, 2026
**Author:** Udit Kumar

---

## v3.0 (March 2026)

### Major Features

#### 📋 Publish History
- New dedicated history page to view all past publish sessions
- Filter by environment (internal/external) and date range (default: last 30 days)
- Expandable session details showing all events and full logs
- Pagination support for navigating large session lists
- Outcome badges showing session status: `success`, `partial`, `dryrun`, `missing`, `blocked`, `crash`, `incomplete`

#### 🎨 Dark/Light Theme Toggle
- Fixed theme toggle in top-right corner (☽/☀ symbol)
- Persistent theme preference stored in browser localStorage
- Applies theme synchronously before page render (no flash-of-wrong-theme)
- Covers all UI components: control panel, forms, history table, log drawer, toast notifications, update banner
- Uses CSS override pattern (`html[data-theme="light"]`) for zero impact on existing styles

#### 🔔 Toast Notifications
- Real-time toast notifications for user actions
- Four notification types: `success` (green), `error` (red), `warning` (amber), `info` (cyan)
- Auto-dismiss after 4 seconds with close button (✕)
- Max 5 simultaneous toasts with slide-in/out animation
- Integrated into publish flows (validation errors, upload failures, dry runs, success completions)
- Accessible markup with `role="alert"` for screen readers

#### 📊 CSV Export for History
- Export filtered history sessions to CSV file
- Includes: timestamp, environment, username, file count, outcome, success/error counts, force/dryrun flags
- Proper cell escaping for special characters and line breaks
- One-click download with toast confirmation

#### 🔄 Improved Update Checker
- VPN-friendly fallback chain: tries `raw.githubusercontent.com` (CDN) first, then `api.github.com` (API)
- More reliable version detection on restricted networks
- Single-session caching to reduce API calls

### Bug Fixes

- **Fixed toast close button layout**: Resolved CSS conflict where global button width rule (`width: 100%` on mobile) squashed toast close button
- **Fixed theme flash-of-unstyled-content**: Theme script now reads and applies saved preference synchronously before DOMContentLoaded
- **Fixed history pagination**: Sessions now sorted newest-first by default

### Code Quality

- Removed all comments from codebase (frontend and backend)
- Clean, self-documenting code with meaningful function and event names
- Consistent logging structure using semantic event names (`external.start`, `internal.ftp.done`, etc.)

### Project Structure

```
prod-pusher/
├── index.html                    # Control panel
├── style.css                     # Global styles
├── assets/
│   ├── icon.ico                 # App icon (favicon + exe)
│   ├── toast.js                 # Toast notification system
│   ├── theme-toggle.js          # Dark/light theme toggle
│   ├── log-drawer.js
│   ├── quick-wins.js
│   └── includes.js
├── history/
│   ├── index.html
│   └── history.js
├── internal/
│   └── index.html
├── external/
│   └── index.html
├── server/
│   ├── server.js                # Express API + publish routes
│   ├── ftpClient.js
│   └── ftpclient.js
└── package.json
```

---

**Release Date:** March 18, 2026
**Author:** Udit Kumar
