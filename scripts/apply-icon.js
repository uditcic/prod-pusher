// scripts/apply-icon.js
// Post-build step: stamps assets/icon.ico into the Windows PE header of the exe.
// Run automatically via the postbuild:exe npm lifecycle hook.
const rcedit = require("rcedit");
const path = require("path");

const exe  = path.join(__dirname, "../dist/Prod-Pusher.exe");
const icon = path.join(__dirname, "../assets/icon.ico");

rcedit(exe, { icon })
  .then(() => console.log("Done. Icon stamped into dist/Prod-Pusher.exe"))
  .catch(e  => { console.error("Icon error:", e.message); process.exit(1); });
