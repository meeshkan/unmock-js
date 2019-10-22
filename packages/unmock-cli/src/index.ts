import * as program from "commander";
import { init, list, open } from "./commands/";

export default () => {
  program.usage("unmock <command>");

  program
    .command("init [dirname]")
    .option("--installer [installer]", "Specify Package Manager (yarn/npm)")
    .option("--offline", "Specify whether to allow install from cache")
    .option("--verbose", "Specify verbosity of output messages")
    .action(init);

  program
    .command("open <hash>")
    .option(
      "-e, --editor [editor]",
      "editor (defaults to the EDITOR env variable or, in the absence of this, vi)",
    )
    .action(open);

  program.command("list").action(list);

  program.parse(process.argv);
};
