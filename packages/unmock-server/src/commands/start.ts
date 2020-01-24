import { Command, flags } from "@oclif/command";
import debug from "debug";
import { deletePidFile, writePid } from "../pid";
import { startProxy } from "../proxy";
import { buildApp, startServer } from "../server";

const debugLog = debug("unmock-server:start");

const log = (...args: any[]) => console.log(...args); // tslint:disable-line

const addCleanUp = (callback: () => void) => {
  process.on("exit", callback);

  process.on("SIGINT", () => {
    process.exit(2);
  });

  process.on("uncaughtException", e => {
    log("Uncaught exception: %s", e.stack);
    process.exit(99);
  });

  process.on("SIGTERM", () => process.exit(2));
};

export default class Start extends Command {
  public static description = "Start unmock server and proxy";

  public static examples = [
    `$ unmock-server start
`,
  ];

  public static flags = {
    help: flags.help({ char: "h" }),
  };

  public static args = [];

  public async run() {
    debugLog("Starting.");
    const run = () => {
      const { app } = buildApp();
      const [httpServer, httpsServer] = startServer(app);
      const proxyServer = startProxy();

      debugLog("Writing PID to file for closing...");
      writePid();

      const cleanUp = () => {
        debugLog("Received SIGTERM. Stopping servers.");
        httpServer.close();
        httpsServer.close();
        proxyServer.close();
        debugLog("Servers closed.");
        deletePidFile();
      };

      addCleanUp(cleanUp);
    };
    run();
  }
}
