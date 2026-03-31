# Prod-Pusher Changelog

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

- **Fixed publish history logging**: Internal publish route now correctly logs `internal.end` events for successful and failed uploads, ensuring history page shows accurate outcomes
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
├── style.css                     # Global styles (theme overrides applied externally)
├── assets/
│   ├── toast.js                 # Toast notification system (new)
│   ├── theme-toggle.js          # Dark/light theme toggle (new)
│   ├── log-drawer.js
│   ├── quick-wins.js
│   └── includes.js
├── history/                      # History page (new)
│   ├── index.html
│   └── history.js
├── internal/
│   └── index.html               # Now with toast notifications
├── external/
│   └── index.html               # Now with toast notifications
├── server/
│   ├── server.js                # Express API + publish routes
│   ├── ftpClient.js
│   └── ftpclient.js
└── package.json                 # Updated assets, v3.0
```

### Breaking Changes

None. v3.0 is fully backward compatible with v2.x.

### Migration Guide

No migration needed. Simply replace the executable or redeploy.

### Known Limitations

- History is cleared when logs are archived (default retention: 30 days in-app, logs stored on-disk)
- CSV export does not include raw event logs (only session summaries)
- Theme preference is browser-local (not synced across devices)

### What's Next

- Option to delete live files from production
- Scheduled/batch publishing
- Email notifications on publish completion

---

**Release Date:** March 18, 2026
**Author:** Udit Kumar
