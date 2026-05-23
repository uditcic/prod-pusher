# Prod-Pusher Changelog

This repository is release-only. Changelog entries are intentionally limited to user-facing release notes and do not include source layout, infrastructure details, logs, credentials, or internal environment names.

## v3.4

- Release packaging moved out of git-tracked source history.
- Repository limited to metadata and documentation files.
- Executable distribution handled through GitHub Releases.

## v3.2

- Improved old-version cleanup when launching a newer executable.
- Added safer handling for files that are still locked by a running process.
- Improved path matching so the active executable is not removed during cleanup.

## v3.1

- Added automatic cleanup of older executable versions.
- Improved application navigation and release metadata display.
- Updated application icon handling.
- Fixed publish history completion status in the user interface.

## v3.0

- Added publish history views and CSV export.
- Added light and dark theme support.
- Added toast notifications for user actions and publish outcomes.
- Improved update checks on restricted networks.
- Fixed history pagination and theme initialization behavior.
