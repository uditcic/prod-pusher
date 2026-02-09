const ftp = require("basic-ftp");
const readline = require("readline");
const path = require("path");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    try {
        const environment = await askQuestion("Environment (internal/external): ");
        const username = await askQuestion("FTP Username: ");
        const password = await askQuestion("FTP Password: ");
        const filesInput = await askQuestion("Enter relative file paths (comma-separated): ");
        const fileList = filesInput.split(',').map(file => file.trim());

        let config;
        if (environment.toLowerCase() === 'internal') {
            config = {
                host: "10.24.221.168",
                port: 21,
                user: username,
                password: password,
                localDir: "X:/connexion",
                remoteDir: "/cicintranet/connexion"
            };
        } else if (environment.toLowerCase() === 'external') {
            config = {
                host: "167.40.65.240", // or "167.44.3.235" for Gatineau
                port: 21,
                user: username,
                password: password,
                localDir: "W:/release1",
                remoteDir: "/cicnet/www_cicnet_gc_ca"
            };
        } else {
            console.log("Invalid environment specified.");
            rl.close();
            return;
        }

        const client = new ftp.Client();
        client.ftp.verbose = true;

        await client.access({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            secure: false
        });

        for (const filePath of fileList) {
            const localPath = path.join(config.localDir, filePath);
            const remotePath = path.join(config.remoteDir, filePath).replace(/\\/g, '/');

            // Ensure remote directory exists
            const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
            await client.ensureDir(remoteDir);

            console.log(`Uploading ${localPath} to ${remotePath}...`);
            await client.uploadFrom(localPath, remotePath);
        }

        console.log("All files uploaded successfully.");
        client.close();
        rl.close();
    } catch (err) {
        console.error("An error occurred:", err);
        rl.close();
    }
}

main();
