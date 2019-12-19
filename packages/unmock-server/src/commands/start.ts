import { Command, flags } from "@oclif/command";
import { startProxy } from "../proxy";
import { buildApp, startServer } from "../server";

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
    const run = () => {
      const { app } = buildApp();
      startServer(app);
      startProxy();
    };
    run();
  }
}
