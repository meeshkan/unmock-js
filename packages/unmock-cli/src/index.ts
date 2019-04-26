import program from "commander";

import curl from "./curl";
import list from "./list";
import open from "./open";

export default () => {
  const collect = (val: string, memo: string[]) => {
    memo.push(val);
    return memo;
  };

  program
    .usage("unmock <command>");

  program
    .command("curl <url>")
    .option("-d, --data [data]", "HTTP POST data")
    .option(
      "-H, --header [header]",
      "Pass custom header(s) to server",
      collect,
      [],
    )
    .option("-X", "--request [command]", "Specify request command to use")
    .option(
      "-S",
      "--signature [signature]",
      "Specify a signature for a request in tokenless mode",
    )
    .action(curl);

  program
    .command("open <hash>")
    .option("-e, --editor [editor]", "editor (defaults to the EDITOR env variable or, in the absence of this, vi)")
    .action(open);

  program
    .command("list")
    .action(list);

  program.parse(process.argv);
};
