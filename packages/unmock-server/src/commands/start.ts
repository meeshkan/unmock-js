import { Command, flags } from "@oclif/command";
import debug from "debug";
import { writePid } from "../pid";
import { startProxy } from "../proxy";
import { buildApp, startServer } from "../server";

const debugLog = debug("unmock-server:start");

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

      const sigTermHandler = () => {
        debugLog("Received SIGTERM. Stopping servers.");
        httpServer.close();
        httpsServer.close();
        proxyServer.close();
        debugLog("Servers closed.");
      };

      process.on("SIGTERM", sigTermHandler);
      debugLog("Writing PID to file for closing...");
      writePid();
    };
    run();
  }
}
