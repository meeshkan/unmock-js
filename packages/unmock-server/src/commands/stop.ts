import { Command, flags } from "@oclif/command";
import debug from "debug";
import { readPidIfExists, TERM_SIGNAL } from "../pid";

const debugLog = debug("unmock-server:stop");
const log = (...args: any[]) => console.log(...args); // tslint:disable-line

export default class Stop extends Command {
  public static description = "Stop unmock server and proxy.";

  public static examples = [
    `$ unmock-server stop
`,
  ];

  public static flags = {
    help: flags.help({ char: "h" }),
  };

  public static args = [];

  /**
   * Server process is stopped by sending a SIGTERM to the process PID written to the file-system.
   */
  public async run() {
    const pidOrNull = readPidIfExists();

    if (pidOrNull === null) {
      log("Server not running.");
      return;
    }

    try {
      process.kill(pidOrNull, 0);
    } catch (ex) {
      log("Server not running.");
      return;
    }

    debugLog("Sending %s to PID %d", TERM_SIGNAL, pidOrNull);
    process.kill(pidOrNull, TERM_SIGNAL);
    log("Server stopped.");
  }
}
