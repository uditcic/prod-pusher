const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

function toPosix(p){ return p.replace(/\\/g,"/"); }
function norm(p){ return path.normalize(p); }

async function pushFiles({ host, port=21, secure=false, user, password, passive=true, mappings=[], files=[], timeoutMs=60000 }){
  const client = new ftp.Client(timeoutMs);
  client.ftp.verbose = false;
  const results = [];
  try {
    await client.access({ host, port, user, password, secure, passive });
    for(const abs of files){
      try{
        const absNorm = norm(abs);
        const m = mappings.find(x => absNorm.toLowerCase().startsWith(norm(x.from).toLowerCase()));
        if(!m){ results.push({ file: abs, status: "skipped", error: "No mapping matched" }); continue; }
        const rel = absNorm.slice(norm(m.from).length).replace(/^([\\/])/, "");
        const remote = toPosix(path.posix.join(m.to, rel.replace(/\\/g,"/")));
        const remoteDir = path.posix.dirname(remote);
        if(!fs.existsSync(absNorm)) throw new Error("Local file not found");
        await client.ensureDir(remoteDir);
        await client.uploadFrom(absNorm, remote);
        results.push({ file: abs, remote, status: "ok" });
      }catch(e){
        results.push({ file: abs, status: "error", error: String(e.message||e) });
      }
    }
  } finally {
    client.close();
  }
  return results;
}

module.exports = { pushFiles };
