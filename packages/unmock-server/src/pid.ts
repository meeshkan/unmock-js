/* Code for saving process PID into local file system.*/
import debug from "debug";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";

const debugLog = debug("unmock-server:pid");

export const DEFAULT_CONFIG_DIRECTORY = path.resolve(
    os.homedir(),
    ".unmock"
);

// Signal used for terminating process
export const TERM_SIGNAL = "SIGTERM";

export const PID_FILENAME = 'server.pid';

const ensureDirExists = (directory: string) => {
    if (!fs.existsSync(directory)) {
      debugLog(`Creating directory: ${directory}`);
      return mkdirp.sync(directory);
    }

    if (!fs.lstatSync(directory).isDirectory()) {
      throw Error(`Destination exists but is not directory: ${directory}`);
    }

    debugLog(`Directory exists: ${directory}`);

    return;
};

export const writePid = (directory = DEFAULT_CONFIG_DIRECTORY) => {
    const pid = process.pid;

    ensureDirExists(directory);

    const pidFile = path.join(directory, PID_FILENAME);
    debugLog("Writing pid (%d) to %s", pid, pidFile)
    fs.writeFileSync(pidFile, pid);
};

export const readPidIfExists = (directory = DEFAULT_CONFIG_DIRECTORY): number | null => {
    const pidFile = path.join(directory, PID_FILENAME);
    if (!fs.existsSync(pidFile)) {
        debugLog("File not found: %s", pidFile);
        return null;
    }

    const contents = fs.readFileSync(pidFile).toString();

    return parseInt(contents, 10);
}

export const deletePidFile = (directory = DEFAULT_CONFIG_DIRECTORY): void => {
    const pidFile = path.join(directory, PID_FILENAME);
    if (!fs.existsSync(pidFile)) {
        debugLog("File not found: %s", pidFile);
        return;
    }
    debugLog("Deleting file %s.", pidFile);
    fs.unlinkSync(pidFile);
}
