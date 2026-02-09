// server/ftpClient.js
const path = require("path");
// point at your portable basic-ftp install
const ftp = require(path.join(__dirname, "../node-v22/node_modules/basic-ftp"));

/**
 * Push a list of files via FTP.
 * @param {Object} options
 * @param {'internal'|'external'} options.type
 * @param {string} options.host
 * @param {string} options.user
 * @param {string} options.password
 * @param {string} options.localDir
 * @param {string} options.remoteDir
 * @param {string[]} options.fileList  // relative paths, Windows-style (backslashes)
 */
async function pushFiles({ type, host, user, password, localDir, remoteDir, fileList }) {
  const client = new ftp.Client();
  client.ftp.verbose = false; // set true for debug

  try {
    await client.access({ host, user, password, secure: false, port: 21 });

    // Ensure base remote dir
    await client.ensureDir(remoteDir);

    // Upload each file
    for (const rel of fileList) {
      const localPath  = path.join(localDir, rel);
      const remotePath = `${remoteDir}/${rel.replace(/\\\\/g, "/")}`;
      const remoteDirOnly = remotePath.split("/").slice(0, -1).join("/");

      await client.ensureDir(remoteDirOnly);
      await client.uploadFrom(localPath, remotePath);
    }
  } catch (err) {
    throw new Error(`FTP push (${type}) error: ${err.message}`);
  } finally {
    client.close();
  }
}

module.exports = { pushFiles };
