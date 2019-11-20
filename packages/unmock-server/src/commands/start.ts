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
    // flag with a value (-n, --name=VALUE)
    /* name: flags.string({
      char: "n",
      description: "name to print",
    }), */
    // flag with no value (-f, --force)
    // force: flags.boolean({ char: "f" }),
  };

  public static args = [];

  public async run() {
    // const { args, flags: flagz } = this.parse(Start);

    const run = () => {
      const { app } = buildApp();
      startServer(app);
      startProxy();
    };
    run();
  }
}
