// scripts/apply-icon.mjs
// Post-build step: stamps assets/icon.ico into the exe using pure-JS PE editing.
// Replaces rcedit (which corrupts pkg-produced executables).

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { NtExecutable, NtExecutableResource } from "pe-library";
import { Data, Resource } from "resedit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exePath  = join(__dirname, "../dist/Prod-Pusher.exe");
const iconPath = join(__dirname, "../assets/icon.ico");

try {
  const data = readFileSync(exePath);
  const exe  = NtExecutable.from(data);
  const res  = NtExecutableResource.from(exe);

  const iconFile = Data.IconFile.from(readFileSync(iconPath));
  Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    1,      // icon group ID
    1033,   // language (English US)
    iconFile.icons.map(i => i.data)
  );

  res.outputResource(exe);
  writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log("Done. Icon applied to dist/Prod-Pusher.exe");
} catch (e) {
  console.error("Icon error:", e.message);
  process.exit(1);
}
